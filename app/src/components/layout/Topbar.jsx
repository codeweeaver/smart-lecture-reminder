import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import { ROUTES } from "../../constants/routes.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import GlobalSearchPalette from "../common/GlobalSearchPalette.jsx";
import GlobalSearchTrigger from "../common/GlobalSearchTrigger.jsx";
import NotificationBell from "../notifications/NotificationBell.jsx";

const PAGE_TITLES = {
  [ROUTES.CALENDAR]: "Calendar",
  [ROUTES.COURSES]: "My Courses",
  [ROUTES.SETTINGS]: "Settings",
  [ROUTES.ADMIN]: "Dashboard",
  [ROUTES.ADMIN_LECTURES]: "Lectures",
  [ROUTES.ADMIN_COURSES]: "Courses",
  [ROUTES.ADMIN_USERS]: "Users",
  [ROUTES.LECTURER]: "My Lectures",
};

export default function Topbar() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const pageTitle = PAGE_TITLES[pathname];
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      const isShortcut =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (!isShortcut) return;
      const target = e.target;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping) return;
      e.preventDefault();
      setSearchOpen(true);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-2 md:hidden">
        {pageTitle ? (
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {pageTitle}
          </span>
        ) : (
          <>
            <div className="flex items-center justify-center w-8 h-8 p-1 rounded-lg bg-noun-50 dark:bg-noun-950/40">
              <img
                src={logo}
                alt="NOUN"
                className="object-contain w-full h-full"
              />
            </div>
            <span className="text-sm font-bold font-display text-noun-700 dark:text-noun-400">
              NOUN Reminder
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />
        <NotificationBell />
        <div className="items-center hidden gap-2 text-sm text-gray-600 md:flex dark:text-gray-300">
          <div className="flex items-center justify-center text-xs font-bold text-white rounded-full w-7 h-7 bg-noun-500 shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="hidden leading-tight lg:block">
            <p className="font-medium text-gray-800 dark:text-gray-100">
              {profile?.full_name}
            </p>
            <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
          </div>
        </div>
      </div>

      <GlobalSearchPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </header>
  );
}
