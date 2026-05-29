import { useState } from 'react'

export default function MultipleChoice({ question, onAnswer }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  function handleSelect(choice) {
    if (submitted) return
    setSelected(choice)
    setSubmitted(true)
    onAnswer(choice.correct)
  }

  return (
    <div className="quiz-card">
      <div className="quiz-meta">
        <span className={`level-badge ${question.level}`}>{question.level}</span>
      </div>
      <p className="quiz-question">{question.question}</p>
      <p className="quiz-sentence">{question.sentence}</p>
      <p className="quiz-translation">{question.translation}</p>

      <div className="choices">
        {question.choices.map((choice, i) => {
          let cls = 'choice-btn'
          if (submitted) {
            if (choice.correct) cls += ' correct'
            else if (choice === selected && !choice.correct) cls += ' wrong'
          }
          return (
            <button key={i} className={cls} onClick={() => handleSelect(choice)}>
              {choice.text}
            </button>
          )
        })}
      </div>

      {submitted && (
        <div className={`result ${selected?.correct ? 'correct' : 'wrong'}`}>
          <p className="result-icon">{selected?.correct ? '⭕ 正確！' : '❌ 錯誤'}</p>
          <div className="explanation-box">
            <p><strong>正確答案：</strong>{question.answer}</p>
            <p><strong>接續：</strong>{question.structure}</p>
            <p><strong>解說：</strong>{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  )
}
