import { useEffect, useState } from "react";
import { useSettings } from "../../contexts/SettingsContext.jsx";
import { supabase } from "../../services/supabase.js";
import { formatDate } from "../../utils/formatters.js";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { Modal } from "../ui/Modal.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import TMAForm from "./TMAForm.jsx";

export default function TMADeadlinesSection() {
  const { activeSession } = useSettings();
  const [tmaDeadlines, setTMADeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTMAForm, setShowTMAForm] = useState(false);
  const [editTMANumber, setEditTMANumber] = useState(null);

  async function loadData() {
    const { data } = await supabase.from("tma_deadlines").select("*").order("due_date");
    setTMADeadlines(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // TMA deadlines are semester-wide — index by tma_number for O(1) lookup
  const tmaByNumber = Object.fromEntries((tmaDeadlines || []).map((t) => [t.tma_number, t]));

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        TMA deadlines apply to{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">all enrolled students</span> for the{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">{activeSession}</span> session.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => {
            const t = tmaByNumber[n];
            return (
              <div
                key={n}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full shrink-0">
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{n}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">TMA {n}</p>
                  {t ? (
                    <p className="text-xs text-gray-500">Due: {formatDate(t.due_date, "EEE, MMM d · h:mm a")}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Not set</p>
                  )}
                </div>
                {t && (
                  <Badge color={t.reminder_sent ? "green" : "orange"}>
                    {t.reminder_sent ? "Notified" : "Pending"}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant={t ? "outline" : "secondary"}
                  onClick={() => {
                    setEditTMANumber(n);
                    setShowTMAForm(true);
                  }}
                >
                  {t ? "Edit" : "Set"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showTMAForm}
        onClose={() => setShowTMAForm(false)}
        title={`Set TMA ${editTMANumber ?? ""} Deadline`}
      >
        <TMAForm
          prefillNumber={editTMANumber}
          onSaved={() => {
            setShowTMAForm(false);
            loadData();
          }}
          onCancel={() => setShowTMAForm(false)}
        />
      </Modal>
    </div>
  );
}
