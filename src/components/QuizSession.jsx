import { useState, useMemo } from 'react'
import FillBlank from './FillBlank'
import MultipleChoice from './MultipleChoice'
import Matching from './Matching'
import Reorder from './Reorder'
import { generateQuiz, generateWeakQuiz, generateSrsQuiz } from '../utils/quiz'
import { allGrammar, grammarByLevel } from '../data'

export default function QuizSession({ selectedLevels, progress, quizCount, mode = 'normal', srsDue = [], srsFresh = [], onRecord, onFinish }) {
  const pool = useMemo(() => {
    return selectedLevels.flatMap(l => grammarByLevel[l] || [])
  }, [selectedLevels])

  const [questions] = useState(() => {
    const count = quizCount || 10
    if (mode === 'srs') {
      return generateSrsQuiz(srsDue, srsFresh, pool, allGrammar, count)
    }
    if (mode === 'weak') {
      return generateWeakQuiz(pool, allGrammar, progress, count)
    }
    return generateQuiz(pool, allGrammar, count)
  })
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState([])

  function handleAnswer(correct) {
    const q = questions[current]
    // For matching questions, record for all involved grammar IDs
    if (q.type === 'matching') {
      q.grammarId.split(',').forEach(id => onRecord(id, correct, q.type))
    } else {
      onRecord(q.grammarId, correct, q.type)
    }
    setResults(prev => [...prev, { ...q, correct }])
  }

  function handleNext() {
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1)
    } else {
      onFinish(results)
    }
  }

  if (questions.length === 0) {
    return <div className="empty-state">沒有可用的文法題目，請選擇至少一個級別。</div>
  }

  const q = questions[current]
  const answered = results.length > current

  return (
    <div className="quiz-session">
      <div className="quiz-progress">
        <span>第 {current + 1} / {questions.length} 題</span>
        {mode === 'weak' && <span className="weak-mode-badge">弱點加強</span>}
        {mode === 'srs' && <span className="weak-mode-badge srs-badge">間隔複習</span>}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {q.type === 'fill' && (
        <FillBlank key={current} question={q} onAnswer={handleAnswer} />
      )}
      {q.type === 'choice' && (
        <MultipleChoice key={current} question={q} onAnswer={handleAnswer} />
      )}
      {q.type === 'matching' && (
        <Matching key={current} question={q} onAnswer={handleAnswer} />
      )}
      {q.type === 'reorder' && (
        <Reorder key={current} question={q} onAnswer={handleAnswer} />
      )}

      {answered && (
        <button className="next-btn" onClick={handleNext}>
          {current + 1 < questions.length ? '下一題 →' : '查看結果'}
        </button>
      )}
    </div>
  )
}
