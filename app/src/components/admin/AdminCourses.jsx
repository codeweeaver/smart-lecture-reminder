import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiEdit2, FiPlus, FiTrash2, FiUpload } from "react-icons/fi";
import { useSettings } from "../../contexts/SettingsContext.jsx";
import { supabase, fetchAllRows } from "../../services/supabase.js";
import { Button } from "../ui/Button.jsx";
import { CollapsibleSearch } from "../ui/CollapsibleSearch.jsx";
import { Modal } from "../ui/Modal.jsx";
import { Select } from "../ui/Select.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { useToast } from "../ui/Toast.jsx";
import BulkCourseImportModal from "./BulkCourseImportModal.jsx";
import CourseForm from "./CourseForm.jsx";

export default function AdminCourses() {
  const toast = useToast();
  const { activeSession } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCourse, setEditCourse] = useState(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showBulkCourses, setShowBulkCourses] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("all");

  async function loadData() {
    const data = await fetchAllRows(() => supabase.from("courses").select("*").order("course_code"));
    setCourses(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Deep-link from global search: prefill the course filter
  useEffect(() => {
    const q = location.state?.query;
    if (!q) return;
    setSearch(q);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, navigate, location.pathname]);

  async function deleteCourse(id) {
    if (!confirm("Delete this course?")) return;
    await supabase.from("courses").delete().eq("id", id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
    toast("Course deleted", "success");
  }

  const programmeOptions = [...new Set(courses.map((c) => c.programme).filter(Boolean))].sort();

  const filteredCourses = courses.filter((c) => {
    const q = search.toLowerCase();
    const matchText = !q || c.course_code.toLowerCase().includes(q) || c.course_title.toLowerCase().includes(q);
    const matchLevel = levelFilter === "all" || String(c.level) === levelFilter;
    const matchProgramme = programmeFilter === "all" || c.programme === programmeFilter;
    return matchText && matchLevel && matchProgramme;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="max-w-5xl p-4 mx-auto"
    >
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-display">Courses</h1>
        <p className="text-sm text-gray-500">Manage the course catalogue</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="w-28 shrink-0">
          <Select size="sm" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="all">All levels</option>
            {[100, 200, 300, 400].map((lvl) => (
              <option key={lvl} value={String(lvl)}>
                {lvl} Level
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40 shrink-0">
          <Select size="sm" value={programmeFilter} onChange={(e) => setProgrammeFilter(e.target.value)}>
            <option value="all">All programmes</option>
            {programmeOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <CollapsibleSearch
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code or title…"
          ariaLabel="Search courses"
        />

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button
            onClick={() => {
              setEditCourse(null);
              setShowCourseForm(true);
            }}
            size="sm"
          >
            <FiPlus size={14} className="mr-1" />
            New Course
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBulkCourses(true)}>
            <FiUpload size={14} className="mr-1" />
            Import Courses
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
          {filteredCourses.length === 0 ? (
            <p className="py-6 text-sm text-center text-gray-400">
              {courses.length === 0 ? "No courses yet" : "No courses match your filters"}
            </p>
          ) : (
            filteredCourses.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl"
              >
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                  style={{ backgroundColor: (c.color_hex || "#1a9a5c") + "20" }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color_hex || "#1a9a5c" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.course_code}</p>
                  <p className="text-xs text-gray-400">{c.course_title}</p>
                </div>
                <span className="text-xs text-gray-500">{c.credit_units} CU</span>
                <button
                  onClick={() => {
                    setEditCourse(c);
                    setShowCourseForm(true);
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={() => deleteCourse(c.id)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-red-400"
                >
                  <FiTrash2 size={14} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      )}

      <Modal isOpen={showCourseForm} onClose={() => setShowCourseForm(false)} title={editCourse ? "Edit Course" : "New Course"}>
        <CourseForm
          course={editCourse}
          onSaved={() => {
            setShowCourseForm(false);
            loadData();
          }}
          onCancel={() => setShowCourseForm(false)}
        />
      </Modal>
      <BulkCourseImportModal
        isOpen={showBulkCourses}
        onClose={() => setShowBulkCourses(false)}
        onImported={loadData}
        activeSession={activeSession}
      />
    </motion.div>
  );
}
