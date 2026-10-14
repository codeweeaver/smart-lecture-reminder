import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useCalendar } from '../contexts/CalendarContext.jsx'
import { useLectures } from '../contexts/LecturesContext.jsx'
import CalendarHeader from '../components/calendar/CalendarHeader.jsx'
import MonthView from '../components/calendar/MonthView.jsx'
import WeekView from '../components/calendar/WeekView.jsx'
import DayView from '../components/calendar/DayView.jsx'
import LectureDetailSheet from '../components/calendar/LectureDetailSheet.jsx'
import NotificationPanel from '../components/notifications/NotificationPanel.jsx'
import { BottomSheet } from '../components/ui/BottomSheet.jsx'
import { FiFileText } from 'react-icons/fi'
import { formatDate } from '../utils/formatters.js'

export default function CalendarPage() {
  const { viewMode, setSelectedDate } = useCalendar()
  const { lectures, tmaDeadlines } = useLectures()
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedLecture, setSelectedLecture] = useState(null)
  const [selectedTMA, setSelectedTMA] = useState(null)

  // Deep-link from global search: openLectureId / openTMAId in nav state
  useEffect(() => {
    const { openLectureId, openTMAId } = location.state || {}
    if (!openLectureId && !openTMAId) return

    if (openLectureId) {
      const match = lectures.find(l => l.id === openLectureId)
      if (match) {
        setSelectedLecture(match)
        setSelectedDate(new Date(match.start_time))
      }
    } else if (openTMAId) {
      const match = tmaDeadlines.find(t => t.id === openTMAId)
      if (match) {
        setSelectedTMA(match)
        setSelectedDate(new Date(match.due_date))
      }
    }

    // Clear so back-nav / re-visits don't re-trigger the sheet
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, lectures, tmaDeadlines, navigate, setSelectedDate, location.pathname])

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh)]">
      <CalendarHeader />

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={viewMode} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.18 }} className="h-full">
            {viewMode === 'month' && <MonthView onLectureClick={setSelectedLecture} onTMAClick={setSelectedTMA} />}
            {viewMode === 'week'  && <WeekView  onLectureClick={setSelectedLecture} onTMAClick={setSelectedTMA} />}
            {viewMode === 'day'   && <DayView   onLectureClick={setSelectedLecture} onTMAClick={setSelectedTMA} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <LectureDetailSheet lecture={selectedLecture} isOpen={!!selectedLecture} onClose={() => setSelectedLecture(null)} />

      <BottomSheet isOpen={!!selectedTMA} onClose={() => setSelectedTMA(null)} title="TMA Deadline">
        {selectedTMA && (
          <div className="px-4 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <FiFileText className="text-yellow-600" size={18} />
              </div>
              <div>
                <p className="font-bold text-gray-900">TMA {selectedTMA.tma_number}  {selectedTMA.course_code}</p>
                <p className="text-sm text-gray-500">Due: {formatDate(selectedTMA.due_date, 'EEEE, MMM d · h:mm a')}</p>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <p className="text-sm text-yellow-800">Submit your Tutor Marked Assignment on the NOUN eLearn portal before the deadline.</p>
            </div>
          </div>
        )}
      </BottomSheet>

      <NotificationPanel />
    </div>
  )
}
