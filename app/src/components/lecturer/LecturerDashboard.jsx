import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiFilter,
  FiMessageSquare,
  FiMoreVertical,
  FiRefreshCw,
  FiVideo,
  FiXCircle,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useSettings } from "../../contexts/SettingsContext.jsx";
import { useCountdown } from "../../hooks/useCountdown.js";
import { supabase } from "../../services/supabase.js";
import { getDistinctCourseColor } from "../../utils/colorPalette.js";
import { bucketUpcomingLectures } from "../../utils/dateHelpers.js";
import { formatDate, formatTimeRange } from "../../utils/formatters.js";
import { GRADIENT_HERO, GRADIENT_HERO_TEXT } from "../../utils/gradientPresets.js";
import { isLiveLecture, isPastLecture, isUpcomingLecture } from "../../utils/zoomHelpers.js";
import { Badge } from "../ui/Badge.jsx";
import { Dropdown } from "../ui/Dropdown.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { GradientStatCard } from "../ui/GradientStatCard.jsx";
import { Modal } from "../ui/Modal.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import AddRecordingForm from "./AddRecordingForm.jsx";
import AnnouncementForm from "./AnnouncementForm.jsx";
import CancelModal from "./CancelModal.jsx";
import RescheduleModal from "./RescheduleModal.jsx";

const statusColors = {
  scheduled: "noun",
  cancelled: "red",
  rescheduled: "orange",
  completed: "gray",
};

const STAT_TABS = [
  { id: "thisWeek", label: "This Week", icon: FiCalendar, color: "noun" },
  { id: "scheduled", label: "Scheduled", icon: FiCheckCircle, color: "blue" },
  { id: "cancelled", label: "Cancelled", icon: FiXCircle, color: "red" },
  { id: "announced", label: "Announced", icon: FiMessageSquare, color: "yellow" },
];

const SORT_OPTIONS = [
  { id: "all", label: "All Time" },
  { id: "previous", label: "Previous" },
  { id: "thisWeek", label: "This Week" },
  { id: "nextWeek", label: "Next Week" },
  { id: "thisMonth", label: "This Month" },
  { id: "upcoming", label: "Upcoming" },
];

function matchesSortFilter(lecture, filter, now) {
  const start = parseISO(lecture.start_time);
  switch (filter) {
    case "previous":
      return start < now;
    case "thisWeek":
      return start >= startOfWeek(now) && start <= endOfWeek(now);
    case "nextWeek": {
      const nextWeekStart = addDays(startOfWeek(now), 7);
      const nextWeekEnd = addDays(endOfWeek(now), 7);
      return start >= nextWeekStart && start <= nextWeekEnd;
    }
    case "thisMonth":
      return start >= startOfMonth(now) && start <= endOfMonth(now);
    case "upcoming":
      return start >= now;
    default:
      return true;
  }
}

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = SORT_OPTIONS.find((o) => o.id === value) ?? SORT_OPTIONS[0];

  return (
    <div ref={ref} className="relative inline-block shrink-0 ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-noun-300 transition-colors whitespace-nowrap"
      >
        <FiFilter size={12} className="text-gray-400" />
        {current.label}
        <FiChevronDown size={12} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden py-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                opt.id === value
                  ? "text-noun-600 dark:text-noun-400 font-medium bg-noun-50 dark:bg-noun-950/30"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {opt.label}
              {opt.id === value && <FiCheck size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatStrip({ lectures, announcedCount, tab, onChange }) {
  const now = new Date();
  const weekEnd = addDays(now, 7);
  const thisWeek = lectures.filter((l) => {
    const s = parseISO(l.start_time);
    return s >= now && s <= weekEnd;
  }).length;
  const scheduled = lectures.filter((l) => l.status !== "cancelled").length;
  const cancelled = lectures.filter((l) => l.status === "cancelled").length;
  const values = { thisWeek, scheduled, cancelled, announced: announcedCount };

  return (
    <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
      {STAT_TABS.map((t) => (
        <GradientStatCard
          key={t.id}
          variant={tab === t.id ? "gradient" : "flat"}
          color={t.color}
          icon={t.icon}
          label={t.label}
          value={values[t.id]}
          onClick={() => onChange(t.id)}
          hideArrow
        />
      ))}
    </div>
  );
}

function NextLectureHero({ lecture }) {
  const isLive = isLiveLecture(lecture);
  const countdown = useCountdown(lecture.start_time);
  const canJoin =
    lecture.meeting_web_url && (isLive || isUpcomingLecture(lecture, 30));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl shadow-lg shadow-noun-900/10 p-4 mb-5 ${GRADIENT_HERO} ${GRADIENT_HERO_TEXT}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-white/70">Next Up</span>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            LIVE NOW
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-white/80"><FiClock size={11} /> {countdown}</span>
        )}
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-1">{lecture.course_code}</h3>
      <p className="text-sm text-white/80">{formatTimeRange(lecture.start_time, lecture.end_time)}</p>
      {canJoin && (
        <a
          href={lecture.meeting_deep_link || lecture.meeting_web_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 w-full bg-white hover:bg-gray-50 text-noun-700 text-sm font-semibold py-2 rounded-xl transition"
        >
          <FiVideo size={14} /> Join Zoom
        </a>
      )}
    </motion.div>
  );
}

function LectureCardSkeleton() {
  return (
    <div className="relative flex bg-white border border-gray-100 dark:bg-gray-900 dark:border-gray-800 rounded-xl">
      <div className="absolute inset-y-0 left-0 w-1 bg-gray-200 dark:bg-gray-700 rounded-l-xl" />
      <div className="flex-1 py-3 pl-4 pr-3 space-y-2">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-32 h-3" />
      </div>
    </div>
  );
}

function LectureCard({ lecture, onAction, index = 0 }) {
  const countdown = useCountdown(lecture.start_time);
  const isCancelled = lecture.status === "cancelled";
  const color = isCancelled
    ? "#ef4444"
    : getDistinctCourseColor(lecture.course_code, lecture.color_hex);
  const canJoin =
    lecture.status === "scheduled" &&
    lecture.meeting_web_url &&
    (isLiveLecture(lecture) || isUpcomingLecture(lecture, 30));

  const menuItems = [
    ...(lecture.status === "scheduled"
      ? [
          {
            label: "Reschedule",
            icon: FiRefreshCw,
            onClick: () => onAction("reschedule", lecture),
          },
          {
            label: "Cancel",
            icon: FiXCircle,
            onClick: () => onAction("cancel", lecture),
            variant: "danger",
          },
        ]
      : []),
    {
      label: "Announce",
      icon: FiMessageSquare,
      onClick: () => onAction("announcement", lecture),
    },
    {
      label: "Recording",
      icon: FiVideo,
      onClick: () => onAction("recording", lecture),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
      className="relative flex bg-white border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 rounded-xl hover:shadow-md"
    >
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0 py-3 pl-4 pr-3">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`font-bold text-base text-gray-900 dark:text-gray-100 ${isCancelled ? "line-through text-gray-400" : ""}`}
          >
            {lecture.course_code}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge color={statusColors[lecture.status] || "gray"}>
              {lecture.status}
            </Badge>
            <Dropdown
              trigger={<FiMoreVertical size={16} />}
              items={menuItems}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400 tabular-nums">
            {format(parseISO(lecture.start_time), "h:mm a")}
          </span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-500">
            {isCancelled ? "Cancelled" : countdown}
          </span>
          {lecture.announcement && (
            <span className="text-xs text-gold-600">📢 Announced</span>
          )}
        </div>
        {canJoin && (
          <a
            href={lecture.meeting_deep_link || lecture.meeting_web_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex items-center gap-1.5 bg-noun-500 hover:bg-noun-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <FiVideo size={12} /> Join Zoom
          </a>
        )}
      </div>
    </motion.div>
  );
}

function DaySection({ label, lectures, onAction }) {
  return (
    <div className="mb-4">
      <p className="px-1 mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
        {label}
      </p>
      <div className="space-y-2">
        {lectures.map((l, i) => (
          <LectureCard key={l.id} lecture={l} onAction={onAction} index={i} />
        ))}
      </div>
    </div>
  );
}

export default function LecturerDashboard() {
  const { user } = useAuth();
  const { activeSession } = useSettings();
  const [tab, setTab] = useState("thisWeek");
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [courseFilter, setCourseFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("all");

  async function loadLectures() {
    if (!user) return;
    const { data } = await supabase
      .from("lectures")
      .select("*")
      .eq("facilitator_id", user.id)
      .eq("academic_session", activeSession)
      .order("start_time", { ascending: true });
    setLectures(data || []);
    setLoading(false);
  }
  useEffect(() => {
    loadLectures();
  }, [user, activeSession]);

  function openModal(type, lecture) {
    setSelected(lecture);
    setModal(type);
  }
  function closeModal() {
    setModal(null);
    setSelected(null);
  }

  const now = new Date();
  const withAnnouncements = lectures.filter((l) => l.announcement);

  const nextLecture = useMemo(
    () =>
      lectures
        .filter((l) => l.status === "scheduled" && !isPastLecture(l))
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0],
    [lectures],
  );

  const distinctCourses = useMemo(() => {
    const map = new Map();
    lectures.forEach((l) => {
      if (!map.has(l.course_code)) map.set(l.course_code, l.color_hex);
    });
    return [...map.entries()].map(([code, colorHex]) => ({
      code,
      color: getDistinctCourseColor(code, colorHex),
    }));
  }, [lectures]);

  const courseFiltered =
    courseFilter === "all"
      ? lectures
      : lectures.filter((l) => l.course_code === courseFilter);

  const upcomingLectures = courseFiltered.filter((l) =>
    isAfter(parseISO(l.start_time), now),
  );
  // "Scheduled" is everything still on the calendar (including rescheduled),
  // "Cancelled" is the rest — every lecture lands in exactly one of the two.
  const scheduledList = courseFiltered
    .filter((l) => l.status !== "cancelled")
    .filter((l) => matchesSortFilter(l, sortFilter, now));
  const cancelledList = courseFiltered.filter((l) => l.status === "cancelled");

  const bucketed = useMemo(
    () => bucketUpcomingLectures(upcomingLectures),
    [upcomingLectures],
  );

  return (
    <div className="max-w-3xl p-4 mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-display">
          Lecturer Panel
        </h1>
        <p className="text-sm text-gray-500">
          Manage your assigned lectures and announcements
        </p>
      </div>

      <StatStrip
        lectures={lectures}
        announcedCount={withAnnouncements.length}
        tab={tab}
        onChange={setTab}
      />

      {tab !== "announced" &&
        (distinctCourses.length > 1 || tab === "scheduled") && (
          <div className="flex items-center gap-1.5 mb-4">
            {distinctCourses.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setCourseFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                    courseFilter === "all"
                      ? "bg-noun-500 text-white border-noun-500"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-noun-300"
                  }`}
                >
                  All
                </button>
                {distinctCourses.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCourseFilter(c.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                      courseFilter === c.code
                        ? "bg-noun-500 text-white border-noun-500"
                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-noun-300"
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          courseFilter === c.code ? "#fff" : c.color,
                      }}
                    />
                    {c.code}
                  </button>
                ))}
              </div>
            )}

            {tab === "scheduled" && (
              <SortDropdown value={sortFilter} onChange={setSortFilter} />
            )}
          </div>
        )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <LectureCardSkeleton key={i} />
          ))}
        </div>
      ) : tab === "thisWeek" ? (
        <>
          {nextLecture && <NextLectureHero lecture={nextLecture} />}
          {bucketed.days.length === 0 ? (
            <EmptyState
              icon={FiCalendar}
              title="No lectures this week"
              description="You have no lectures scheduled for the next 7 days."
            />
          ) : (
            <>
              {bucketed.days.map((d) => (
                <DaySection
                  key={d.label + d.date}
                  label={d.label}
                  lectures={d.lectures}
                  onAction={openModal}
                />
              ))}
            </>
          )}
        </>
      ) : tab === "scheduled" ? (
        scheduledList.length === 0 ? (
          <EmptyState
            icon={FiCheckCircle}
            title="No scheduled lectures"
            description={
              sortFilter === "all"
                ? "Lectures you schedule will appear here."
                : "No lectures match this filter — try a different range."
            }
          />
        ) : (
          <div className="space-y-2">
            {scheduledList.map((l, i) => (
              <LectureCard key={l.id} lecture={l} onAction={openModal} index={i} />
            ))}
          </div>
        )
      ) : tab === "cancelled" ? (
        cancelledList.length === 0 ? (
          <EmptyState
            icon={FiXCircle}
            title="No cancelled lectures"
            description="Lectures you cancel will appear here."
          />
        ) : (
          <div className="space-y-2">
            {cancelledList.map((l, i) => (
              <LectureCard key={l.id} lecture={l} onAction={openModal} index={i} />
            ))}
          </div>
        )
      ) : withAnnouncements.length === 0 ? (
        <EmptyState
          icon={FiMessageSquare}
          title="No announcements"
          description="Post an announcement from a lecture to notify enrolled students."
        />
      ) : (
        <div className="space-y-3">
          {withAnnouncements.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {l.course_code}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(l.start_time, "MMM d")}
                </p>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {l.announcement}
              </p>
              <button
                onClick={() => openModal("announcement", l)}
                className="mt-2 text-xs text-yellow-700 dark:text-yellow-500 hover:underline"
              >
                Edit announcement
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <RescheduleModal
        lecture={selected}
        isOpen={modal === "reschedule"}
        onClose={closeModal}
        onRescheduled={loadLectures}
      />
      <CancelModal
        lecture={selected}
        isOpen={modal === "cancel"}
        onClose={closeModal}
        onCancelled={loadLectures}
      />

      <Modal
        isOpen={modal === "announcement"}
        onClose={closeModal}
        title="Post Announcement"
      >
        {selected && (
          <AnnouncementForm
            lecture={selected}
            onPosted={() => {
              closeModal();
              loadLectures();
            }}
            onCancel={closeModal}
          />
        )}
      </Modal>
      <Modal
        isOpen={modal === "recording"}
        onClose={closeModal}
        title="Add Recording Link"
      >
        {selected && (
          <AddRecordingForm
            lecture={selected}
            onAdded={() => {
              closeModal();
              loadLectures();
            }}
            onCancel={closeModal}
          />
        )}
      </Modal>
    </div>
  );
}
