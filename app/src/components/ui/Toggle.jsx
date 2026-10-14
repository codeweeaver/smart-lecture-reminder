export function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-noun-500 focus:ring-offset-1 ${checked ? 'bg-noun-500' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}
