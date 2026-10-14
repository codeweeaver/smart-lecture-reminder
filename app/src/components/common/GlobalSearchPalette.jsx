import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FiSearch, FiX, FiBookOpen, FiFileText, FiBook, FiUser } from 'react-icons/fi'
import { useGlobalSearch } from '../../hooks/useGlobalSearch.js'
import { Skeleton } from '../ui/Skeleton.jsx'
import { SectionLabel } from '../ui/SectionLabel.jsx'

const TYPE_ICON = { lecture: FiBookOpen, tma: FiFileText, course: FiBook, user: FiUser }

const TYPE_BADGE_CLASS = {
  tma: 'bg-yellow-100 dark:bg-yellow-900/60',
  course: 'bg-noun-50 dark:bg-noun-950/40',
  user: 'bg-noun-100 dark:bg-noun-950/40',
}

const TYPE_ICON_CLASS = {
  tma: 'text-yellow-600 dark:text-yellow-400',
  course: 'text-noun-500',
  user: 'text-noun-600 dark:text-noun-400',
}

export default function GlobalSearchPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const inputRef = useRef(null)
  const search = useGlobalSearch(isOpen)

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  function handleSelect(item) {
    navigate(item.to, { state: item.state })
    onClose()
  }

  function handleInputKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      search.moveActiveIndex(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      search.moveActiveIndex(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = search.flatResults[search.activeIndex] ?? search.flatResults[0]
      if (item) handleSelect(item)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-input"
            className="fixed inset-x-4 top-[10vh] sm:top-20 z-50 mx-auto max-w-xl sm:max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[75vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <FiSearch size={16} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                id="global-search-input"
                type="text"
                value={search.query}
                onChange={e => search.setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={search.placeholder}
                role="combobox"
                aria-expanded={search.hasAnyResults}
                aria-controls="global-search-listbox"
                aria-activedescendant={search.activeIndex >= 0 ? `search-option-${search.activeIndex}` : undefined}
                autoComplete="off"
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none placeholder:text-gray-400"
              />
              {search.query && (
                <button
                  type="button"
                  onClick={() => search.setQuery('')}
                  aria-label="Clear search"
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>

            <div className="sr-only" aria-live="polite">
              {search.loadingExtras
                ? 'Loading…'
                : search.hasQuery
                  ? `${search.flatResults.length} result${search.flatResults.length === 1 ? '' : 's'} found`
                  : ''}
            </div>

            <div id="global-search-listbox" role="listbox" aria-label="Search results" className="flex-1 overflow-y-auto no-scrollbar">
              {!search.hasQuery && (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <FiSearch size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400">{search.placeholder}</p>
                </div>
              )}

              {search.hasQuery && !search.hasAnyResults && !search.loadingExtras && (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-noun-50 dark:bg-noun-950/40 flex items-center justify-center mb-3">
                    <FiSearch size={20} className="text-noun-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">No results for "{search.query}"</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try a different search term</p>
                </div>
              )}

              {search.hasQuery && search.sectionOrder.map(type => {
                const items = search.groups[type]
                if (items.length === 0) return null
                const globalStartIndex = search.flatResults.indexOf(items[0])
                const Icon = TYPE_ICON[type]
                return (
                  <div key={type}>
                    <SectionLabel className="px-4 pt-3 pb-1">{search.sectionLabels[type]}</SectionLabel>
                    {items.map((item, i) => {
                      const flatIndex = globalStartIndex + i
                      const isActive = flatIndex === search.activeIndex
                      const badgeClass = type === 'lecture' ? '' : TYPE_BADGE_CLASS[type]
                      const iconClass = type === 'lecture' ? '' : TYPE_ICON_CLASS[type]
                      return (
                        <div
                          key={item.id}
                          id={`search-option-${flatIndex}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => search.setActiveIndex(flatIndex)}
                          onClick={() => handleSelect(item)}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                            isActive ? 'bg-noun-50 dark:bg-noun-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${badgeClass}`}
                            style={type === 'lecture' ? { backgroundColor: (item.colorHex || '#1a9a5c') + '20' } : undefined}
                          >
                            <Icon
                              size={15}
                              className={iconClass}
                              style={type === 'lecture' ? { color: item.colorHex || '#1a9a5c' } : undefined}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.primary}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.secondary}{item.meta ? ` · ${item.meta}` : ''}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {search.totalCounts[type] > items.length && (
                      <p className="px-4 py-1.5 text-xs text-gray-400">
                        {search.totalCounts[type] - items.length} more, refine your search
                      </p>
                    )}
                  </div>
                )
              })}

              {search.loadingExtras && (
                <div className="px-4 py-2 space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
