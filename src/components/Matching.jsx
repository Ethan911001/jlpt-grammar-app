import { useState } from 'react'

export default function Matching({ question, onAnswer }) {
  const [selectedLeft, setSelectedLeft] = useState(null)
  const [matched, setMatched] = useState({}) // leftIdx -> rightIdx
  const [wrongPair, setWrongPair] = useState(null)
  const [done, setDone] = useState(false)
  const [mistakes, setMistakes] = useState(0)

  const { pairs, shuffledRight } = question

  function handleRightClick(rightIdx) {
    if (done || selectedLeft === null) return

    const leftItem = pairs[selectedLeft]
    const rightItem = shuffledRight[rightIdx]

    if (leftItem.meaning === rightItem.meaning) {
      const next = { ...matched, [selectedLeft]: rightIdx }
      setMatched(next)
      setSelectedLeft(null)
      setWrongPair(null)

      if (Object.keys(next).length === pairs.length) {
        setDone(true)
        onAnswer(mistakes === 0)
      }
    } else {
      setMistakes(m => m + 1)
      setWrongPair({ left: selectedLeft, right: rightIdx })
      setTimeout(() => setWrongPair(null), 600)
    }
  }

  function handleLeftClick(leftIdx) {
    if (done || matched[leftIdx] !== undefined) return
    setSelectedLeft(leftIdx === selectedLeft ? null : leftIdx)
  }

  return (
    <div className="quiz-card">
      <div className="quiz-meta">
        <span className={`level-badge ${question.level}`}>{question.level}</span>
        <span className="grammar-name">配對題</span>
      </div>
      <p className="quiz-hint">將左邊的文法與右邊的意思配對</p>

      <div className="matching-grid">
        <div className="matching-col">
          {pairs.map((p, i) => {
            let cls = 'match-item left'
            if (matched[i] !== undefined) cls += ' matched'
            else if (selectedLeft === i) cls += ' selected'
            if (wrongPair?.left === i) cls += ' wrong-flash'
            return (
              <button key={i} className={cls} onClick={() => handleLeftClick(i)}>
                {p.grammar}
              </button>
            )
          })}
        </div>
        <div className="matching-col">
          {shuffledRight.map((r, i) => {
            const isMatched = Object.values(matched).includes(i)
            let cls = 'match-item right'
            if (isMatched) cls += ' matched'
            if (wrongPair?.right === i) cls += ' wrong-flash'
            return (
              <button key={i} className={cls} onClick={() => handleRightClick(i)}>
                {r.meaning}
              </button>
            )
          })}
        </div>
      </div>

      {done && (
        <div className={`result ${mistakes === 0 ? 'correct' : 'wrong'}`}>
          <p className="result-icon">{mistakes === 0 ? '⭕ 全部正確！' : `完成！錯誤 ${mistakes} 次`}</p>
          <div className="explanation-box">
            {pairs.map((p, i) => (
              <p key={i}><strong>{p.grammar}</strong> → {p.meaning}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
