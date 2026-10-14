export function Checkbox({ label, className = '', checked, onChange, ...props }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} {...props} />
      <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center shrink-0 ${checked ? 'bg-noun-500 border-noun-500' : 'border-gray-300 bg-white'}`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}
