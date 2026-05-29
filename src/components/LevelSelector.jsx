import { levels } from '../data'

export default function LevelSelector({ selected, onChange }) {
  return (
    <div className="level-selector">
      {levels.map(level => (
        <button
          key={level}
          className={`level-btn ${level} ${selected.includes(level) ? 'active' : ''}`}
          onClick={() => {
            if (selected.includes(level)) {
              if (selected.length > 1) onChange(selected.filter(l => l !== level))
            } else {
              onChange([...selected, level])
            }
          }}
        >
          {level}
        </button>
      ))}
      <button
        className={`level-btn ${selected.length === levels.length ? 'active' : ''}`}
        onClick={() => onChange(selected.length === levels.length ? [levels[0]] : [...levels])}
      >
        全部
      </button>
    </div>
  )
}
