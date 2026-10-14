export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  )
}
