import { useRef, useState } from "react";
import { FiCheckCircle, FiDownload, FiUpload, FiXCircle } from "react-icons/fi";
import { parseCSV } from "../../utils/csvParser.js";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { Modal } from "../ui/Modal.jsx";
import { useToast } from "../ui/Toast.jsx";

const LECTURER_CSV_HEADERS = "email,full_name,faculty,department,courses";
const LECTURER_CSV_EXAMPLE =
  "dr.ibrahim.adamu@noun.edu.ng,Dr. Ibrahim Adamu,Faculty of Science and Technology,Computer Science,CIT 401;CIT 405";

const REQUIRED_COLS = ["email", "full_name", "faculty", "department"];

// courses column is optional: semicolon-separated course codes e.g. "CIT 401;CIT 403"
function parseCourses(raw) {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);
}

export default function BulkLecturerImportModal({
  isOpen,
  onClose,
  onImported,
}) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [stage, setStage] = useState("idle"); // idle | preview | importing | done
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  function downloadTemplate() {
    const csv = LECTURER_CSV_HEADERS + "\n" + LECTURER_CSV_EXAMPLE;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), {
      href: url,
      download: "lecturer-template.csv",
    }).click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = parseCSV(text);
    const missing = REQUIRED_COLS.filter(
      (c) => !parsed[0] || !(c in parsed[0]),
    );
    if (missing.length) {
      toast(`CSV missing columns: ${missing.join(", ")}`, "error");
      return;
    }
    const validRows = parsed.filter(
      (r) => r.email?.trim() && r.full_name?.trim(),
    );
    if (validRows.length === 0) {
      toast("No valid rows found", "error");
      return;
    }
    setRows(validRows);
    setStage("preview");
  }

  async function handleImport() {
    setImporting(true);
    setStage("importing");
    setProgress({ done: 0, total: rows.length });
    const res = [];
    for (const row of rows) {
      const courses = parseCourses(row.courses);
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-lecturer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": import.meta.env.VITE_INTERNAL_SECRET,
            },
            body: JSON.stringify({
              email: row.email.trim(),
              full_name: row.full_name.trim(),
              faculty: (row.faculty || "").trim(),
              department: (row.department || "").trim(),
              courses,
            }),
          },
        );
        let json = {};
        try {
          json = await resp.json();
        } catch {
          /* empty or non-JSON body */
        }
        res.push({
          email: row.email,
          full_name: row.full_name,
          courses,
          ok: resp.ok,
          activated: json.activated ?? false,
          reactivated: json.reactivated ?? false,
          error: resp.ok
            ? null
            : json.error || `Server error (HTTP ${resp.status})`,
        });
      } catch (err) {
        res.push({
          email: row.email,
          full_name: row.full_name,
          courses,
          ok: false,
          error: err.message,
        });
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setResults(res);
    setStage("done");
    setImporting(false);
    const failed = res.filter((r) => !r.ok).length;
    if (failed === 0) {
      toast(`${res.length} lecturer(s) imported successfully`, "success");
    } else {
      toast(`${res.length - failed} imported, ${failed} failed`, "error");
    }
  }

  function handleClose() {
    const hadSuccess = stage === "done" && results.some((r) => r.ok);
    setStage("idle");
    setRows([]);
    setResults([]);
    setProgress({ done: 0, total: 0 });
    onClose();
    if (hadSuccess) onImported?.();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Lecturers via CSV"
      size="md"
    >
      {stage === "idle" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Bulk-create lecturer accounts from a CSV file. Default password is{" "}
            <code className="bg-gray-100 px-1 rounded text-xs font-mono">
              12345
            </code>
            . Include the optional{" "}
            <code className="bg-gray-100 px-1 rounded text-xs font-mono">
              courses
            </code>{" "}
            column (semicolon-separated codes, e.g.{" "}
            <code className="bg-gray-100 px-1 rounded text-xs font-mono">
              CIT 401;CIT 405
            </code>
            ) to assign courses and activate the account immediately no manual
            approval step needed.
          </p>
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 text-center">
            <FiUpload className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-sm text-gray-500 mb-1">
              Required:{" "}
              <code className="text-xs bg-white border border-gray-200 px-1 rounded">
                email, full_name, faculty, department
              </code>
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Optional:{" "}
              <code className="text-xs bg-white border border-gray-200 px-1 rounded">
                courses
              </code>{" "}
              (semicolon-separated codes)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFile}
            />
            <Button onClick={() => fileRef.current?.click()}>
              Choose CSV file
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-sm text-noun-600 hover:underline"
            >
              <FiDownload size={14} />
              Download template
            </button>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-end">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {stage === "preview" && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            Preview <strong>{rows.length}</strong> lecturer(s) to import:
          </p>
          <div className="max-h-64 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-2 mb-4">
            {rows.map((r, i) => {
              const courses = parseCourses(r.courses);
              return (
                <div key={i} className="px-2 py-2 rounded-lg bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">
                    {r.full_name}
                  </p>
                  <p className="text-xs text-gray-400">{r.email}</p>
                  <p className="text-xs text-gray-400">
                    {r.faculty} / {r.department}
                  </p>
                  {courses.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {courses.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] bg-noun-100 text-noun-700 px-1.5 py-0.5 rounded-full font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setStage("idle")}>
              Back
            </Button>
            <Button onClick={handleImport} loading={importing}>
              Import {rows.length} Lecturer{rows.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {stage === "importing" && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-gray-500">
            Creating lecturer account {progress.done.toLocaleString()} /{" "}
            {progress.total.toLocaleString()}…
          </p>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-noun-500 h-2 rounded-full transition-all duration-300"
              style={{
                width:
                  progress.total > 0
                    ? `${(progress.done / progress.total) * 100}%`
                    : "5%",
              }}
            />
          </div>
          <p className="text-xs text-gray-400">
            Each account is created one at a time this can take several minutes
            for large files.
          </p>
        </div>
      )}

      {stage === "done" && (
        <div>
          <p className="text-sm text-gray-500 mb-3">Import complete:</p>
          <div className="max-h-64 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-2 mb-4">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-2 py-2 rounded-lg"
              >
                {r.ok ? (
                  <FiCheckCircle
                    className="text-green-500 shrink-0 mt-0.5"
                    size={15}
                  />
                ) : (
                  <FiXCircle
                    className="text-red-500 shrink-0 mt-0.5"
                    size={15}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{r.full_name}</p>
                  <p className="text-xs text-gray-400">{r.email}</p>
                  {r.ok && r.courses.length > 0 && (
                    <p className="text-xs text-noun-600 mt-0.5">
                      {r.courses.join(", ")} assigned
                    </p>
                  )}
                  {!r.ok && <p className="text-xs text-red-500">{r.error}</p>}
                </div>
                {r.ok && (
                  <Badge
                    color={
                      r.reactivated ? "noun" : r.activated ? "green" : "orange"
                    }
                  >
                    {r.reactivated
                      ? "updated"
                      : r.activated
                        ? "active"
                        : "pending"}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
