import { getLecturePosition, detectOverlap } from '../../utils/dateHelpers.js'
import LectureBlock from './LectureBlock.jsx'

const HOUR_HEIGHT_PX = 60 // px per hour
const GRID_START_HOUR = 6
const GRID_TOTAL_HOURS = 17

export default function DayColumn({ lectures = [], onLectureClick }) {
  const laid = detectOverlap(lectures)

  return (
    <div className="relative" style={{ height: `${GRID_TOTAL_HOURS * HOUR_HEIGHT_PX}px` }}>
      {laid.map((lecture) => {
        const start = lecture.startTime?.toDate ? lecture.startTime.toDate() : new Date(lecture.startTime)
        const end = lecture.endTime?.toDate ? lecture.endTime.toDate() : new Date(lecture.endTime)

        const startMins = (start.getHours() - GRID_START_HOUR) * 60 + start.getMinutes()
        const endMins = (end.getHours() - GRID_START_HOUR) * 60 + end.getMinutes()
        const totalMins = GRID_TOTAL_HOURS * 60

        const top = (startMins / totalMins) * 100
        const height = Math.max(1, ((endMins - startMins) / totalMins) * 100)

        const totalCols = lecture._totalCols || 1
        const col = lecture._col || 0
        const width = `calc(${100 / totalCols}% - 4px)`
        const left = `calc(${(col / totalCols) * 100}% + 2px)`

        return (
          <div
            key={lecture.id}
            className="absolute"
            style={{ top: `${top}%`, height: `${height}%`, width, left, minHeight: '24px' }}
          >
            <LectureBlock lecture={lecture} onClick={onLectureClick} />
          </div>
        )
      })}
    </div>
  )
}
