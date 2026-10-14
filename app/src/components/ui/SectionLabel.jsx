export function SectionLabel({ children, className = '' }) {
  return (
    <p className={`text-xs font-semibold tracking-wide uppercase text-gray-400 dark:text-gray-500 ${className}`}>
      {children}
    </p>
  )
}
