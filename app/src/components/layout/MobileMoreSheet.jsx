import { NavLink } from 'react-router-dom'
import { BottomSheet } from '../ui/BottomSheet.jsx'

export default function MobileMoreSheet({ isOpen, onClose, items }) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="More">
      <div className="p-2 pb-4">
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-noun-50 text-noun-700' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </div>
    </BottomSheet>
  )
}
