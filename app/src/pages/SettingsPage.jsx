import { motion } from "motion/react";
import { useState } from "react";
import SemesterSettings from "../components/admin/SemesterSettings.jsx";
import TMADeadlinesSection from "../components/admin/TMADeadlinesSection.jsx";
import UserSettingsSection from "../components/settings/UserSettingsSection.jsx";
import { Tabs } from "../components/ui/Tabs.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const ADMIN_TABS = ["Semester Settings", "User Settings", "TMA Deadlines"];

export default function SettingsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [tab, setTab] = useState("User Settings");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 max-w-lg mx-auto space-y-6 pb-24 md:pb-6"
    >
      <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-100">Settings</h1>

      {isAdmin ? (
        <>
          <Tabs tabs={ADMIN_TABS} active={tab} onChange={setTab} />
          {tab === "Semester Settings" && <SemesterSettings />}
          {tab === "User Settings" && <UserSettingsSection />}
          {tab === "TMA Deadlines" && <TMADeadlinesSection />}
        </>
      ) : (
        <UserSettingsSection />
      )}
    </motion.div>
  );
}
