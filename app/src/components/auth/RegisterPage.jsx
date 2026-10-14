import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  FiAlertCircle,
  FiBookOpen,
  FiLock,
  FiMonitor,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { FACULTY_DEPARTMENTS } from "../../constants/reminderIntervals.js";
import { ROUTES } from "../../constants/routes.js";
import { signUp } from "../../services/auth.service.js";
import { friendlySupabaseError } from "../../utils/formatters.js";
import { GRADIENT_HERO } from "../../utils/gradientPresets.js";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Select } from "../ui/Select.jsx";

// A NOUN student's email is always their matric number @noun.edu.ng — so the
// matric number is the one thing students actually type; email just follows it.
function deriveStudentEmail(matricNumber) {
  const cleaned = matricNumber.trim().toLowerCase().replace(/\s+/g, "");
  return cleaned ? `${cleaned}@noun.edu.ng` : "";
}

function RoleCard({ value, icon: Icon, title, description, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className="flex items-center gap-2 p-5 transition-all bg-white border-2 border-gray-200 rounded-2xl hover:border-noun-300 hover:bg-noun-50/40 w-full mb-4"
    >
      <div className="flex items-center justify-center bg-gray-100 w-11 h-11 rounded-xl">
        <Icon className="text-gray-500" size={20} />
      </div>
      <div className="ml-3 text-left">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    matricNumber: "",
    faculty: "",
    department: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  function setMatricNumber(e) {
    const matricNumber = e.target.value;
    setForm((f) => ({ ...f, matricNumber, email: deriveStudentEmail(matricNumber) }));
  }

  async function handleSubmit() {
    if (!role) {
      setError("Please select your role first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp({ ...form, role });
      navigate(ROUTES.HOME);
    } catch (err) {
      setError(friendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Fixed to the viewport, independent of page content height — a Select's
          open dropdown is absolutely positioned and doesn't grow this page's
          flow height, so a background tied to content height can end before
          the dropdown does, leaving it floating on the plain page background. */}
      <div className={`fixed inset-0 -z-10 ${GRADIENT_HERO}`} />
      <div className="flex flex-col items-center justify-center min-h-screen p-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 overflow-hidden rounded-2xl bg-white">
              <img
                src={logo}
                alt="NOUN"
                className="object-contain w-full h-full"
              />
            </div>
            <h1 className="text-xl font-bold text-white font-display">
              Create Account
            </h1>
            <p className="mt-1 text-sm text-noun-200">
              {role ? (
                <>
                  Registering as {role === "student" ? "Student" : "Lecturer"}{" "}
                  ·{" "}
                  <button
                    type="button"
                    onClick={() => setRole(null)}
                    className="font-medium text-white hover:underline"
                  >
                    Change role
                  </button>
                </>
              ) : (
                "Smart Lecture Reminder"
              )}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!role ? (
              <motion.div
                key="role-select"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.18 }}
              >
                <div className="p-6 bg-white shadow-2xl rounded-2xl">
                  <h2 className="mb-1 text-lg font-semibold text-center text-gray-900">
                    I am a...
                  </h2>
                  <p className="mb-5 text-sm text-center text-gray-500">
                    Choose your role to continue
                  </p>
                  <div>
                    <RoleCard
                      value="student"
                      icon={FiBookOpen}
                      title="Student"
                      description="Get lecture reminders"
                      onSelect={setRole}
                    />
                    <RoleCard
                      value="lecturer"
                      icon={FiMonitor}
                      title="Lecturer"
                      description="Manage lectures"
                      onSelect={setRole}
                    />
                  </div>
                </div>

                <p className="mt-4 text-sm text-center text-noun-200">
                  Already have an account?{" "}
                  <Link
                    to={ROUTES.LOGIN}
                    className="font-medium text-white hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.18 }}
              >
                <div className="p-6 bg-white shadow-2xl rounded-2xl">
                  {error && (
                    <div className="flex items-start gap-2 px-3 py-3 mb-4 text-sm text-red-700 border border-red-100 bg-red-50 rounded-xl">
                      <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div
                    className="space-y-4"
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && handleSubmit()
                    }
                  >
                    {role === "student" && (
                      <Input
                        label="Matric Number"
                        value={form.matricNumber}
                        onChange={setMatricNumber}
                        placeholder=" "
                      />
                    )}

                    {role === "lecturer" && (
                      <>
                        <Select
                          label="Faculty"
                          value={form.faculty}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              faculty: e.target.value,
                              department: "",
                            }))
                          }
                        >
                          <option value="">Select faculty</option>
                          {Object.keys(FACULTY_DEPARTMENTS).map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </Select>
                        <Select
                          label="Department"
                          value={form.department}
                          onChange={set("department")}
                          disabled={!form.faculty}
                        >
                          <option value="">
                            {form.faculty
                              ? "Select department"
                              : "Select a faculty first"}
                          </option>
                          {(FACULTY_DEPARTMENTS[form.faculty] || []).map(
                            (d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ),
                          )}
                        </Select>
                      </>
                    )}

                    <Input
                      label="Full Name"
                      value={form.fullName}
                      onChange={set("fullName")}
                      autoComplete="name"
                    />

                    {role === "student" ? (
                      <div className="relative">
                        <Input
                          label="Email"
                          type="email"
                          value={form.email}
                          readOnly
                          placeholder="Auto-filled from Matric Number"
                          className="pl-9 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <FiLock
                          size={14}
                          className="absolute left-3 top-11.75 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                      </div>
                    ) : (
                      <Input
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        autoComplete="email"
                      />
                    )}

                    <Input
                      label="Password"
                      type="password"
                      value={form.password}
                      onChange={set("password")}
                      hint="Min 6 characters"
                      autoComplete="new-password"
                    />

                    <Button
                      className="w-full mt-1 h-11"
                      loading={loading}
                      onClick={handleSubmit}
                    >
                      Create Account
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
