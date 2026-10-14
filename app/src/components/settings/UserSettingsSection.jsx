import { useState } from "react";
import {
  FiBell,
  FiLogOut,
  FiShield,
  FiSmartphone,
  FiUpload,
  FiUser,
  FiUserCheck,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { LEVELS, PROGRAMMES, STUDY_CENTRES } from "../../constants/reminderIntervals.js";
import { ROUTES } from "../../constants/routes.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { usePWAInstall } from "../../hooks/usePWAInstall.js";
import { logOut, updateUserProfile } from "../../services/auth.service.js";
import { subscribeToPush, unsubscribeFromPush } from "../../services/push.service.js";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Select } from "../ui/Select.jsx";
import { useToast } from "../ui/Toast.jsx";
import { Toggle } from "../ui/Toggle.jsx";

export default function UserSettingsSection() {
  const { user, profile, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { canInstall, install } = usePWAInstall();

  const isStudent = profile?.role === "student";
  const isLecturer = profile?.role === "lecturer";
  const isAdmin = profile?.role === "admin";

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || "",
    // student fields
    matric_number: profile?.matric_number || "",
    programme: profile?.programme || "",
    level: profile?.level || "",
    study_centre: profile?.study_centre || "",
    // lecturer fields
    faculty: profile?.faculty || "",
    department: profile?.department || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState({
    enabled: profile?.notification_preferences?.enabled ?? true,
    reminders: profile?.notification_preferences?.reminders ?? true,
    announcements: profile?.notification_preferences?.announcements ?? true,
    tma: profile?.notification_preferences?.tma ?? true,
    reminder_minutes: profile?.notification_preferences?.reminder_minutes ?? [
      30, 15, 5,
    ],
  });
  const [savingNotif, setSavingNotif] = useState(false);

  const field = (key) => ({
    value: profileForm[key],
    onChange: (e) => setProfileForm((p) => ({ ...p, [key]: e.target.value })),
  });

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      let updates = { full_name: profileForm.full_name };
      if (isStudent)
        updates = {
          ...updates,
          matric_number: profileForm.matric_number,
          programme: profileForm.programme,
          level: Number(profileForm.level) || null,
          study_centre: profileForm.study_centre,
        };
      if (isLecturer)
        updates = {
          ...updates,
          faculty: profileForm.faculty,
          department: profileForm.department,
        };
      await updateUserProfile(user.id, updates);
      updateProfile(updates);
      toast("Profile updated!", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveNotifications() {
    setSavingNotif(true);
    try {
      await updateUserProfile(user.id, {
        notification_preferences: notifPrefs,
      });
      updateProfile({ notification_preferences: notifPrefs });
      toast("Notification preferences saved!", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSavingNotif(false);
    }
  }

  async function handleEnablePush() {
    const result = await subscribeToPush(user.id);
    if (result.success) toast("Push notifications enabled!", "success");
    else toast("Could not enable push notifications", "error");
  }

  async function handleDisablePush() {
    await unsubscribeFromPush(user.id);
    toast("Push notifications disabled", "success");
  }

  async function handleLogout() {
    await logOut();
    navigate(ROUTES.LOGIN);
  }

  const roleIcon = isAdmin ? (
    <FiShield className="text-noun-500" size={18} />
  ) : isLecturer ? (
    <FiUserCheck className="text-noun-500" size={18} />
  ) : (
    <FiUser className="text-noun-500" size={18} />
  );
  const roleLabel = isAdmin ? "Admin" : isLecturer ? "Lecturer" : "Student";

  return (
    <div className="space-y-6">
      {/* ── Profile ── */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {roleIcon}
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Profile</h2>
          </div>
          <Badge color={isAdmin ? "noun" : isLecturer ? "orange" : "green"}>
            {roleLabel}
          </Badge>
        </div>

        <div className="space-y-3">
          {/* Common */}
          <Input label="Full Name" {...field("full_name")} />

          {/* Admin: email display only */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <p className="w-full px-3 py-2.5 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
          )}

          {/* Lecturer fields */}
          {isLecturer && (
            <>
              <Input
                label="Faculty"
                placeholder="e.g. Faculty of Sciences"
                {...field("faculty")}
              />
              <Input
                label="Department"
                placeholder="e.g. Computer Science"
                {...field("department")}
              />
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Account status:</span>
                <Badge
                  color={
                    profile?.status === "active"
                      ? "green"
                      : profile?.status === "pending"
                        ? "orange"
                        : "red"
                  }
                >
                  {profile?.status || "active"}
                </Badge>
              </div>
            </>
          )}

          {/* Student fields */}
          {isStudent && (
            <>
              <Input
                label="Matric Number"
                placeholder="e.g. NOU200123456"
                {...field("matric_number")}
              />
              <Select
                label="Programme"
                value={profileForm.programme}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, programme: e.target.value }))
                }
              >
                <option value="">Select programme</option>
                {PROGRAMMES.map((prog) => (
                  <option key={prog} value={prog}>
                    {prog}
                  </option>
                ))}
              </Select>
              <Select
                label="Level"
                value={profileForm.level}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    level: Number(e.target.value),
                  }))
                }
              >
                <option value="">Select level</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l} Level
                  </option>
                ))}
              </Select>
              <Select
                label="Study Centre"
                value={profileForm.study_centre}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    study_centre: e.target.value,
                  }))
                }
              >
                <option value="">Select study centre</option>
                {STUDY_CENTRES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </>
          )}

          <Button onClick={handleSaveProfile} loading={savingProfile} size="sm">
            Save Profile
          </Button>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <FiBell className="text-noun-500" size={18} />
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Notifications</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                All notifications
              </p>
              <p className="text-xs text-gray-500">Master switch</p>
            </div>
            <Toggle
              checked={notifPrefs.enabled}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, enabled: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">Lecture reminders</p>
            <Toggle
              checked={notifPrefs.reminders}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, reminders: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">Announcements</p>
            <Toggle
              checked={notifPrefs.announcements}
              onChange={(v) =>
                setNotifPrefs((p) => ({ ...p, announcements: v }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">TMA deadlines</p>
            <Toggle
              checked={notifPrefs.tma}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, tma: v }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={handleDisablePush}>
              Disable Push
            </Button>
            <Button size="sm" onClick={handleEnablePush}>
              Enable Push
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveNotifications}
              disabled={savingNotif}
            >
              {savingNotif ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Course Enrollment — student only ── */}
      {isStudent && (
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiUpload className="text-noun-500" size={18} />
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Course Enrollment</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Re-upload your course registration slip to update enrolled courses.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateProfile({ onboarding_complete: false })}
          >
            Re-upload Course Reg Slip
          </Button>
        </section>
      )}

      {/* ── PWA Install ── */}
      {canInstall && (
        <section className="bg-noun-50 dark:bg-noun-950/30 rounded-2xl border border-noun-200 dark:border-noun-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiSmartphone className="text-noun-600 dark:text-noun-400" size={18} />
            <h2 className="font-semibold text-noun-800 dark:text-noun-300">Install App</h2>
          </div>
          <p className="text-sm text-noun-700 dark:text-noun-400 mb-3">
            Install NOUN Reminder on your home screen for quick access and
            offline use.
          </p>
          <Button size="sm" onClick={install}>
            Install App
          </Button>
        </section>
      )}

      {/* ── Sign Out ── */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
        <Button variant="danger" onClick={handleLogout} className="w-full">
          <FiLogOut size={15} className="mr-2" />
          Sign Out
        </Button>
      </section>

      <p className="text-center text-xs text-gray-400">
        NOUN Smart Lecture Reminder · v1.0
      </p>
    </div>
  );
}
