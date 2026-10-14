import { useState } from 'react'
import { FiMoreHorizontal } from 'react-icons/fi'
import { NavLink } from 'react-router-dom'
import { getNavSectionsForRole, MOBILE_PRIMARY_COUNT } from '../../constants/navConfig.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import MobileMoreSheet from './MobileMoreSheet.jsx'

export default function MobileNav() {
  const { profile } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)

  const allItems = getNavSectionsForRole(profile?.role).flatMap((s) => s.items)
  const primaryCount = MOBILE_PRIMARY_COUNT[profile?.role] ?? allItems.length
  const primaryItems = allItems.slice(0, primaryCount)
  const overflowItems = allItems.slice(primaryCount)

  return (
    <>
      <nav className="bg-white border-t border-gray-100 px-2 py-2 flex justify-around">
        {primaryItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-11 transition-all ${
                isActive ? 'text-noun-600' : 'text-gray-400'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
        {overflowItems.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-11 text-gray-400 transition-all"
          >
            <FiMoreHorizontal size={20} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        )}
      </nav>
      <MobileMoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} items={overflowItems} />
    </>
  )
}
