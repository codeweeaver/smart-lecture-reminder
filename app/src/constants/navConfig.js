import {
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiGrid,
  FiHome,
  FiSettings,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi'
import { ROUTES } from './routes.js'

// Single source of truth for nav items, shared by Sidebar and MobileNav
// (previously two separately-maintained, inconsistently-labeled lists).
export const NAV_SECTIONS = [
  {
    label: 'Menu',
    items: [
      { to: ROUTES.HOME, icon: FiHome, label: 'Dashboard', roles: ['student'], end: true },
      { to: ROUTES.ADMIN, icon: FiGrid, label: 'Overview', roles: ['admin'], end: true },
      { to: ROUTES.LECTURER, icon: FiUserCheck, label: 'My Lectures', roles: ['lecturer'] },
      { to: ROUTES.CALENDAR, icon: FiCalendar, label: 'Calendar', roles: ['student', 'admin', 'lecturer'] },
      { to: ROUTES.COURSES, icon: FiBookOpen, label: 'My Courses', roles: ['student'] },
      { to: ROUTES.ADMIN_LECTURES, icon: FiBookOpen, label: 'Lectures', roles: ['admin'] },
      { to: ROUTES.ADMIN_COURSES, icon: FiBook, label: 'Courses', roles: ['admin'] },
      { to: ROUTES.ADMIN_USERS, icon: FiUsers, label: 'Users', roles: ['admin'] },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: ROUTES.SETTINGS, icon: FiSettings, label: 'Settings', roles: ['student', 'admin', 'lecturer'] },
    ],
  },
]

export function getNavSectionsForRole(role) {
  return NAV_SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(role)) }))
    .filter((s) => s.items.length > 0)
}

// How many nav items fit in the mobile bottom bar before overflowing into
// the "More" sheet. Student/Lecturer never overflow; Admin does (8 items).
export const MOBILE_PRIMARY_COUNT = { student: 4, lecturer: 3, admin: 3 }
