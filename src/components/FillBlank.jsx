import { useState } from 'react'

export default function FillBlank({ question, onAnswer }) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const correct = input.trim() === question.answer

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim()) return
    setSubmitted(true)
    onAnswer(correct)
  }

  return (
    <div className="quiz-card">
      <div className="quiz-meta">
        <span className={`level-badge ${question.level}`}>{question.level}</span>
        <span className="grammar-name">{question.grammar}</span>
      </div>
      <p className="quiz-hint">提示：{question.hint}</p>
      <p className="quiz-question">{question.question}</p>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="fill-form">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="填入答案..."
            autoFocus
            className="fill-input"
          />
          <button type="submit" className="submit-btn">確認</button>
        </form>
      ) : (
        <div className={`result ${correct ? 'correct' : 'wrong'}`}>
          <p className="result-icon">{correct ? '⭕ 正確！' : '❌ 錯誤'}</p>
          {!correct && <p className="correct-answer">正確答案：<strong>{question.answer}</strong></p>}
          <div className="explanation-box">
            <p><strong>完整句子：</strong>{question.fullSentence}</p>
            <p><strong>讀音：</strong>{question.reading}</p>
            <p><strong>中文：</strong>{question.translation}</p>
            <p><strong>解說：</strong>{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  )
}
