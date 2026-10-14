import { FiLogOut } from "react-icons/fi";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { getNavSectionsForRole } from "../../constants/navConfig.js";
import { ROUTES } from "../../constants/routes.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useEnrolledCourses } from "../../hooks/useEnrolledCourses.js";
import { useLecturerCourses } from "../../hooks/useLecturerCourses.js";
import { logOut } from "../../services/auth.service.js";
import { getDistinctCourseColor } from "../../utils/colorPalette.js";
import {
  GRADIENT_HERO,
  GRADIENT_HERO_TEXT,
} from "../../utils/gradientPresets.js";
import { SectionLabel } from "../ui/SectionLabel.jsx";

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-l-4 ${
          isActive
            ? "bg-noun-50 dark:bg-noun-950/40 text-noun-700 dark:text-noun-400 border-noun-500"
            : "text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { enrollments } = useEnrolledCourses();
  const { courses: lecturerCourses, lecturesThisMonth } = useLecturerCourses();

  const sections = getNavSectionsForRole(profile?.role);
  const menuSections = sections.filter((s) => s.label !== "Settings");
  const settingsSection = sections.find((s) => s.label === "Settings");

  async function handleLogout() {
    await logOut();
    navigate(ROUTES.LOGIN);
  }

  return (
    <div className="flex flex-col w-64 h-full bg-white border-r border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      <div className="p-6">
        <div className="flex items-center gap-3">
            {/* sidebar logo */}
          <div className="flex items-center justify-center w-12 h-11 overflow-hidden rounded-full bg-white dark:bg-noun-950/40">
            <img
              src={logo}
              alt="NOUN"
              className="object-contain w-full h-full border-noun-100 border-2 rounded-full dark:border-noun-950/40"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-display">
              Smart Lecture Reminder
            </p>
          </div>
        </div>
      </div>

      <nav className="px-4 space-y-5">
        {menuSections.map((section) => (
          <div key={section.label}>
            <SectionLabel className="px-3 mb-2">{section.label}</SectionLabel>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {profile?.role === "student" && enrollments.length > 0 && (
          <div className="px-4 pt-5 pb-3">
            <SectionLabel className="px-1 mb-2">My Courses</SectionLabel>
            {enrollments.map((e) => (
              <div key={e.id} className="flex items-center gap-2 px-1 py-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      e.custom_color || e.course?.color_hex || "#1a9a5c",
                  }}
                />
                <span className="text-xs text-gray-500 truncate dark:text-gray-400">
                  {e.course?.course_code || e.course_code}
                </span>
              </div>
            ))}
          </div>
        )}

        {profile?.role === "lecturer" && lecturerCourses.length > 0 && (
          <div className="px-4 pt-5 pb-3">
            <SectionLabel className="px-1 mb-2">
              My Assigned Courses
            </SectionLabel>
            {lecturerCourses.map((lc) => (
              <div key={lc.id} className="flex items-center gap-2 px-1 py-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: getDistinctCourseColor(
                      lc.course?.course_code,
                      lc.course?.color_hex,
                    ),
                  }}
                />
                <span className="text-xs text-gray-500 truncate dark:text-gray-400">
                  {lc.course?.course_code}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="px-2 py-2 text-center rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {lecturerCourses.length}
                </p>
                <p className="text-[10px] text-gray-400">Courses</p>
              </div>
              <div className="px-2 py-2 text-center rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {lecturesThisMonth}
                </p>
                <p className="text-[10px] text-gray-400">This month</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {profile?.role !== "admin" && (
        <div className="p-4">
          <div
            className={`rounded-2xl p-4 ${GRADIENT_HERO} ${GRADIENT_HERO_TEXT}`}
          >
            <p className="mb-1 text-xs font-semibold tracking-wide uppercase text-white/70">
              This semester
            </p>
            {profile?.role === "student" ? (
              <>
                <p className="text-lg font-bold font-display">
                  {enrollments.length} course
                  {enrollments.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  enrolled and syncing reminders
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold font-display">
                  {lecturerCourses.length} course
                  {lecturerCourses.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  {lecturesThisMonth} lecture
                  {lecturesThisMonth !== 1 ? "s" : ""} this month
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {settingsSection && (
        <nav className="px-4 pb-4">
          <SectionLabel className="px-3 mb-2">
            {settingsSection.label}
          </SectionLabel>
          <div className="space-y-1">
            {settingsSection.items.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center w-full gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-xl border-l-4 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <FiLogOut size={18} /> Sign Out
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
