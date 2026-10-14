import { addDays, isAfter, isBefore } from "date-fns";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { FiAlertCircle, FiBook, FiCalendar, FiPlus, FiUserCheck, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";
import { supabase, fetchAllRows } from "../../services/supabase.js";
import { formatDate } from "../../utils/formatters.js";
import { BarChart } from "../ui/BarChart.jsx";
import { Button } from "../ui/Button.jsx";
import { GradientStatCard } from "../ui/GradientStatCard.jsx";
import { SectionLabel } from "../ui/SectionLabel.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminOverview() {
  const navigate = useNavigate();
  const [lectures, setLectures] = useState([]);
  const [lectureCount, setLectureCount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      const now = new Date();
      // "Upcoming this week" and the weekday bar chart only ever need lectures
      // within the current calendar week, so scope the query to that window
      // instead of "most recent 50" — with a full semester's worth of real
      // lectures, "most recent by start_time desc" just returns the 50
      // furthest-future rows (near the semester's end), never anything near
      // "now", leaving both widgets looking empty.
      const weekStart = addDays(now, -now.getDay());
      const windowEnd = addDays(now, 7);
      const [{ data: lects }, { count: totalLectures }, cors, { count: pending }, { count: students }] = await Promise.all([
        supabase.from("lectures").select("*").gte("start_time", weekStart.toISOString()).lte("start_time", windowEnd.toISOString()),
        supabase.from("lectures").select("*", { count: "exact", head: true }),
        fetchAllRows(() => supabase.from("courses").select("*").order("course_code")),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
      ]);
      setLectures(lects || []);
      setLectureCount(totalLectures || 0);
      setCourses(cors || []);
      setPendingCount(pending || 0);
      setStudentCount(students || 0);
      setLoading(false);
    }
    loadData();
  }, []);

  const now = new Date();
  const upcomingThisWeek = lectures
    .filter(
      (l) =>
        l.status === "scheduled" &&
        isAfter(new Date(l.start_time), now) &&
        isBefore(new Date(l.start_time), addDays(now, 7)),
    )
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5);

  const levelGroups = [100, 200, 300, 400].map((lvl) => ({
    label: `${lvl} Level`,
    value: courses.filter((c) => c.level === lvl).length,
  }));
  const maxLevelCount = Math.max(...levelGroups.map((g) => g.value), 1);

  const weekStart = addDays(now, -now.getDay());
  const lecturesThisWeekByDay = WEEKDAY_LABELS.map((label, i) => {
    const dayStart = addDays(weekStart, i);
    const count = lectures.filter(
      (l) => l.status === "scheduled" && new Date(l.start_time).toDateString() === dayStart.toDateString(),
    ).length;
    return { label, value: count, hasData: count > 0 };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="max-w-5xl p-4 mx-auto space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-display">Overview</h1>
        <p className="text-sm text-gray-500">Manage lectures, courses, users, and settings</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GradientStatCard
            variant="gradient"
            icon={FiCalendar}
            label="Lectures"
            value={lectureCount}
            onClick={() => navigate(ROUTES.ADMIN_LECTURES)}
          />
          <GradientStatCard
            variant="flat"
            color="blue"
            icon={FiBook}
            label="Courses"
            value={courses.length}
            onClick={() => navigate(ROUTES.ADMIN_COURSES)}
          />
          <GradientStatCard variant="flat" color="purple" icon={FiUsers} label="Students" value={studentCount} />
          <GradientStatCard
            variant="flat"
            color={pendingCount > 0 ? "red" : "yellow"}
            icon={FiUserCheck}
            label="Pending"
            value={pendingCount}
            onClick={() => navigate(ROUTES.ADMIN_USERS)}
          />
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 border border-yellow-200 bg-yellow-50 rounded-xl">
          <FiAlertCircle className="text-yellow-600 shrink-0" size={16} />
          <p className="flex-1 text-sm text-yellow-800">
            {pendingCount} lecturer{pendingCount > 1 ? "s" : ""} awaiting approval
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.ADMIN_USERS)}>
            Review
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Upcoming This Week</SectionLabel>
            <Button size="sm" onClick={() => navigate(ROUTES.ADMIN_LECTURES)}>
              <FiPlus size={13} className="mr-1" />
              New Lecture
            </Button>
          </div>
          {upcomingThisWeek.length === 0 ? (
            <p className="py-4 text-sm text-center text-gray-400">No lectures scheduled this week</p>
          ) : (
            <div className="space-y-2">
              {upcomingThisWeek.map((l) => (
                <div key={l.id} className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                    style={{ backgroundColor: (l.color_hex || "#1a9a5c") + "20" }}
                  >
                    <FiCalendar size={12} style={{ color: l.color_hex || "#1a9a5c" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{l.course_code}</span>
                    <span className="ml-1 text-xs text-gray-400">· {l.facilitator_name}</span>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{formatDate(l.start_time, "EEE d, h:mm a")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Courses by Level</SectionLabel>
            <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.ADMIN_COURSES)}>
              <FiPlus size={13} className="mr-1" />
              New Course
            </Button>
          </div>
          <div className="space-y-3">
            {levelGroups.map((g) => (
              <div key={g.label}>
                <div className="flex justify-between mb-1 text-xs text-gray-600 dark:text-gray-400">
                  <span>{g.label}</span>
                  <span className="font-medium">{g.value}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <div
                    className="h-2 transition-all duration-500 rounded-full bg-gradient-to-r from-noun-400 to-noun-600"
                    style={{ width: `${(g.value / maxLevelCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">{courses.length} total courses</p>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
        <SectionLabel className="mb-3">Lectures This Week</SectionLabel>
        <BarChart data={lecturesThisWeekByDay} />
      </div>
    </motion.div>
  );
}
