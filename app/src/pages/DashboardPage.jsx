import { format } from "date-fns";
import { motion } from "motion/react";
import { useState } from "react";
import LectureDetailSheet from "../components/calendar/LectureDetailSheet.jsx";
import NextUpCard from "../components/dashboard/NextUpCard.jsx";
import TodaySchedule from "../components/dashboard/TodaySchedule.jsx";
import WeekActivityChart from "../components/dashboard/WeekActivityChart.jsx";
import WeekStrip from "../components/dashboard/WeekStrip.jsx";
import NotificationPanel from "../components/notifications/NotificationPanel.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [selectedLecture, setSelectedLecture] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-5xl p-6 pb-24 mx-auto md:pb-6"
    >
      {/* Greeting */}
      <div className="mb-5">
        <p className="text-sm font-medium text-noun-600">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-display">
          Hello, {profile?.full_name?.split(" ")[0] || "Student"} 👋
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        {/* Main column: week overview */}
        <div className="space-y-5 md:col-span-2">
          <WeekStrip />
          <WeekActivityChart />
        </div>

        {/* Side column: what's coming up / today */}
        <div className="space-y-5 md:col-span-3">
          <NextUpCard onLectureClick={setSelectedLecture} />
          <TodaySchedule onLectureClick={setSelectedLecture} />
        </div>
      </div>

      {/* Lecture detail sheet */}
      <LectureDetailSheet
        lecture={selectedLecture}
        isOpen={!!selectedLecture}
        onClose={() => setSelectedLecture(null)}
      />

      {/* Notification panel (fixed-position overlay, mount location doesn't affect layout) */}
      <NotificationPanel />
    </motion.div>
  );
}
