import { useEffect, useState } from "react";
import { FiInfo } from "react-icons/fi";
import { useSettings } from "../../contexts/SettingsContext.jsx";
import { supabase } from "../../services/supabase.js";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Select } from "../ui/Select.jsx";
import { useToast } from "../ui/Toast.jsx";

export default function SemesterSettings() {
  const toast = useToast();
  const { settings: ctxSettings, loading: ctxLoading } = useSettings();
  const [settings, setSettings] = useState(ctxSettings);
  const [saving, setSaving] = useState(false);
  const [carrying, setCarrying] = useState(false);

  useEffect(() => {
    setSettings(ctxSettings);
  }, [ctxSettings]);

  async function handleSave() {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from("app_settings")
          .upsert(
            { key, value, updated_at: new Date().toISOString() },
            { onConflict: "key" },
          );
      }
      toast("Semester settings saved!", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCarryForward() {
    setCarrying(true);
    try {
      const active = ctxSettings.active_academic_session;
      const { data: old, error } = await supabase
        .from("lecturer_courses")
        .select("lecturer_id, course_id")
        .neq("academic_session", active);
      if (error) throw error;
      if (!old?.length) {
        toast("No previous assignments found to carry forward", "error");
        return;
      }
      const rows = old.map((r) => ({
        lecturer_id: r.lecturer_id,
        course_id: r.course_id,
        academic_session: active,
      }));
      const { error: upsertErr } = await supabase
        .from("lecturer_courses")
        .upsert(rows, { onConflict: "lecturer_id,course_id,academic_session" });
      if (upsertErr) throw upsertErr;
      toast(
        `${rows.length} assignment(s) carried forward to ${active}`,
        "success",
      );
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setCarrying(false);
    }
  }

  if (ctxLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  function set(k) {
    return (e) => setSettings((s) => ({ ...s, [k]: e.target.value }));
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4">
        <Input
          label="Academic Session"
          value={settings.active_academic_session}
          onChange={set("active_academic_session")}
          hint="e.g. 2025_2"
        />
        <Select
          label="Active Semester"
          value={settings.active_semester}
          onChange={set("active_semester")}
        >
          <option value="first">First</option>
          <option value="second">Second</option>
        </Select>
        <Input
          label="Facilitation Start"
          type="date"
          value={settings.facilitation_start?.slice(0, 10) || ""}
          onChange={set("facilitation_start")}
        />
        <Input
          label="Facilitation End"
          type="date"
          value={settings.facilitation_end?.slice(0, 10) || ""}
          onChange={set("facilitation_end")}
        />
      </div>

      <Button loading={saving} onClick={handleSave} className="w-full">
        Save Settings
      </Button>

      <div className="flex items-center gap-2 pt-4 mt-1 border-t border-gray-100">
        <Button
          variant="secondary"
          loading={carrying}
          onClick={handleCarryForward}
          className="w-full"
        >
          Carry Forward Lecturer Assignments
        </Button>
        <div className="relative group shrink-0">
          <button
            type="button"
            aria-label="What does Carry Forward Lecturer Assignments do?"
            className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-full hover:text-noun-600 hover:bg-noun-50"
          >
            <FiInfo size={16} />
          </button>
          <div
            role="tooltip"
            className="absolute left-0 z-20 invisible w-64 p-3 mb-2 text-xs text-white transition-opacity duration-150 bg-gray-900 shadow-lg opacity-0 pointer-events-none bottom-full rounded-xl group-hover:opacity-100 group-hover:visible"
          >
            <span className="font-semibold">
              Carry Forward Lecturer Assignments
            </span>{" "}
            copies all lecturer-course assignments from previous sessions into{" "}
            <span className="font-mono">
              {ctxSettings.active_academic_session}
            </span>
            . Run this once at the start of each new semester after updating the
            Academic Session above.
          </div>
        </div>
      </div>
    </div>
  );
}
