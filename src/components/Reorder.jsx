import { useState } from 'react'

export default function Reorder({ question, onAnswer }) {
  const [selected, setSelected] = useState([])
  const [remaining, setRemaining] = useState(question.shuffledParts)
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false)

  function handleSelect(idx) {
    if (submitted) return
    const part = remaining[idx]
    setSelected([...selected, part])
    setRemaining(remaining.filter((_, i) => i !== idx))
  }

  function handleRemove(idx) {
    if (submitted) return
    const part = selected[idx]
    setRemaining([...remaining, part])
    setSelected(selected.filter((_, i) => i !== idx))
  }

  function handleSubmit() {
    const answer = selected.join('')
    const isCorrect = answer === question.correctOrder
    setCorrect(isCorrect)
    setSubmitted(true)
    onAnswer(isCorrect)
  }

  function handleReset() {
    if (submitted) return
    setRemaining(question.shuffledParts)
    setSelected([])
  }

  return (
    <div className="quiz-card">
      <div className="quiz-meta">
        <span className={`level-badge ${question.level}`}>{question.level}</span>
        <span className="grammar-name">{question.grammar}</span>
      </div>
      <p className="quiz-hint">將以下詞組排列成正確的句子</p>
      <p className="quiz-translation">{question.translation}</p>

      <div className="reorder-answer">
        {selected.length === 0 && <span className="reorder-placeholder">點擊下方詞組排列...</span>}
        {selected.map((part, i) => (
          <button key={i} className="reorder-chip placed" onClick={() => handleRemove(i)}>
            {part}
          </button>
        ))}
      </div>

      <div className="reorder-pool">
        {remaining.map((part, i) => (
          <button key={i} className="reorder-chip" onClick={() => handleSelect(i)}>
            {part}
          </button>
        ))}
      </div>

      {!submitted && selected.length > 0 && (
        <div className="reorder-actions">
          <button className="submit-btn" onClick={handleSubmit} disabled={remaining.length > 0}>
            確認
          </button>
          <button className="reset-btn" onClick={handleReset}>重排</button>
        </div>
      )}

      {submitted && (
        <div className={`result ${correct ? 'correct' : 'wrong'}`}>
          <p className="result-icon">{correct ? '⭕ 正確！' : '❌ 錯誤'}</p>
          {!correct && <p className="correct-answer">正確答案：<strong>{question.correctOrder}</strong></p>}
          <div className="explanation-box">
            <p><strong>讀音：</strong>{question.reading}</p>
            <p><strong>解說：</strong>{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  )
}
