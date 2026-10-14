import { COURSE_COLORS } from '../../utils/colorPalette.js'

export default function CourseColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COURSE_COLORS.map(c => (
        <button key={c.hex} onClick={() => onChange(c.hex)} title={c.label}
          className={`w-7 h-7 rounded-full transition ring-offset-2 ${value === c.hex ? 'ring-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </div>
  )
}
