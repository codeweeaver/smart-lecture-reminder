import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiUpload } from "react-icons/fi";
import { supabase } from "../../services/supabase.js";
import { formatDate } from "../../utils/formatters.js";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { CollapsibleSearch } from "../ui/CollapsibleSearch.jsx";
import { Modal } from "../ui/Modal.jsx";
import { Select } from "../ui/Select.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { useToast } from "../ui/Toast.jsx";
import BulkImportModal from "./BulkImportModal.jsx";
import LectureForm from "./LectureForm.jsx";

const STATUS_COLORS = {
  scheduled: "green",
  cancelled: "red",
  rescheduled: "orange",
  completed: "gray",
};

export default function AdminLectures() {
  const toast = useToast();
  const [lectures, setLectures] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editLecture, setEditLecture] = useState(null);
  const [showLectureForm, setShowLectureForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilitatorFilter, setFacilitatorFilter] = useState("all");

  async function loadData() {
    const { data } = await supabase
      .from("lectures")
      .select("*")
      .order("start_time", { ascending: false })
      .limit(50);
    setLectures(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // Preload active lecturers so the New Lecture modal has data ready the moment it opens.
    supabase
      .from("users")
      .select("id, full_name, role, status")
      .order("full_name")
      .then(({ data }) => {
        setLecturers((data || []).filter((u) => u.role === "lecturer" && u.status === "active"));
      });
  }, []);

  async function deleteLecture(id) {
    if (!confirm("Delete this lecture?")) return;
    await supabase.from("lectures").delete().eq("id", id);
    setLectures((prev) => prev.filter((l) => l.id !== id));
    toast("Lecture deleted", "success");
  }

  const filteredLectures = lectures.filter((l) => {
    const q = search.toLowerCase();
    const matchText = !q || l.course_code.toLowerCase().includes(q) || l.facilitator_name.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchFacilitator = facilitatorFilter === "all" || l.facilitator_id === facilitatorFilter;
    return matchText && matchStatus && matchFacilitator;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="max-w-5xl p-4 mx-auto"
    >
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-display">Lectures</h1>
        <p className="text-sm text-gray-500">Create, edit, and manage the lecture schedule</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="w-36 shrink-0">
          <Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
        <div className="w-40 shrink-0">
          <Select size="sm" value={facilitatorFilter} onChange={(e) => setFacilitatorFilter(e.target.value)}>
            <option value="all">All facilitators</option>
            {lecturers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name}
              </option>
            ))}
          </Select>
        </div>
        <CollapsibleSearch
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by course or facilitator…"
          ariaLabel="Search lectures"
        />

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button
            onClick={() => {
              setEditLecture(null);
              setShowLectureForm(true);
            }}
            size="sm"
          >
            <FiPlus size={14} className="mr-1" />
            New Lecture
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBulk(true)}>
            <FiUpload size={14} className="mr-1" />
            Bulk Import
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLectures.length === 0 ? (
            <p className="py-6 text-sm text-center text-gray-400">
              {lectures.length === 0 ? "No lectures yet" : "No lectures match your filters"}
            </p>
          ) : (
            filteredLectures.map((l, i) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl"
              >
                <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: l.color_hex || "#1a9a5c" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {l.course_code} · {l.facilitator_name}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(l.start_time, "EEE, MMM d · h:mm a")}</p>
                </div>
                <Badge color={STATUS_COLORS[l.status] || "gray"}>{l.status}</Badge>
                <button
                  onClick={() => {
                    setEditLecture(l);
                    setShowLectureForm(true);
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={() => deleteLecture(l.id)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-red-400"
                >
                  <FiTrash2 size={14} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      )}

      <Modal
        isOpen={showLectureForm}
        onClose={() => setShowLectureForm(false)}
        title={editLecture ? "Edit Lecture" : "New Lecture"}
      >
        <LectureForm
          lecture={editLecture}
          lecturers={lecturers}
          onSaved={() => {
            setShowLectureForm(false);
            loadData();
          }}
          onCancel={() => setShowLectureForm(false)}
        />
      </Modal>
      <BulkImportModal isOpen={showBulk} onClose={() => setShowBulk(false)} onImported={loadData} />
    </motion.div>
  );
}
