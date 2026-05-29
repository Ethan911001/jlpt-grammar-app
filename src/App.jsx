import { useState, useRef, useCallback, useMemo } from 'react'
import LevelSelector from './components/LevelSelector'
import QuizSession from './components/QuizSession'
import ResultView from './components/ResultView'
import GrammarBrowser from './components/GrammarBrowser'
import { useProgress } from './hooks/useProgress'
import { levels, grammarByLevel, allGrammar } from './data'
import './App.css'

const QUIZ_COUNTS = [5, 10, 20]

const LEVEL_COLORS = {
  N5: '#22c55e',
  N4: '#38bdf8',
  N3: '#eab308',
  N2: '#f97316',
  N1: '#ef4444',
}

export default function App() {
  const [page, setPage] = useState('home')
  const [selectedLevels, setSelectedLevels] = useState([...levels])
  const [sessionResults, setSessionResults] = useState(null)
  const [quizKey, setQuizKey] = useState(0)
  const [quizCount, setQuizCount] = useState(10)
  const [mode, setMode] = useState('normal')
  const {
    progress, record, getWeakPoints, clearProgress,
    bookmarks, toggleBookmark, isBookmarked,
    sessionHistory, recordSession, getLevelStats,
    getDueItems, getSrsStats,
  } = useProgress()

  const recordRef = useRef(record)
  recordRef.current = record
  const stableRecord = useCallback((...args) => recordRef.current(...args), [])

  const pool = useMemo(
    () => selectedLevels.flatMap(l => grammarByLevel[l] || []),
    [selectedLevels]
  )
  const srsStats = getSrsStats(pool)
  const { due: srsDue, fresh: srsFresh } = getDueItems(pool)

  function startQuiz(m = 'normal') {
    setMode(m)
    setSessionResults(null)
    setQuizKey(k => k + 1)
    setPage('quiz')
  }

  function handleFinish(results) {
    recordSession(results)
    setSessionResults(results)
    setPage('result')
  }

  const weakPoints = getWeakPoints()
  const levelStats = getLevelStats()

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => setPage('home')}>日文文法練習</h1>
        <nav>
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>首頁</button>
          <button className={page === 'browse' ? 'active' : ''} onClick={() => setPage('browse')}>文法一覽</button>
        </nav>
      </header>

      <main className="app-main">
        {page === 'home' && (
          <div className="home">
            <div className="home-section">
              <h2>選擇練習級別</h2>
              <LevelSelector selected={selectedLevels} onChange={setSelectedLevels} />
            </div>

            <div className="home-section">
              <h2>題數</h2>
              <div className="quiz-count-selector">
                {QUIZ_COUNTS.map(n => (
                  <button
                    key={n}
                    className={`count-btn ${quizCount === n ? 'active' : ''}`}
                    onClick={() => setQuizCount(n)}
                  >
                    {n} 題
                  </button>
                ))}
              </div>
            </div>

            <div className="start-buttons">
              <button className="start-btn" onClick={() => startQuiz('normal')}>
                開始練習（{quizCount} 題）
              </button>
              {(srsStats.due > 0 || srsStats.fresh > 0) && (
                <button className="start-btn srs-btn" onClick={() => startQuiz('srs')}>
                  間隔複習（{srsStats.due > 0 ? `${srsStats.due} 條待複習` : `${quizCount} 新題`}）
                </button>
              )}
              {weakPoints.length > 0 && (
                <button className="start-btn weak-btn" onClick={() => startQuiz('weak')}>
                  弱點加強（{quizCount} 題）
                </button>
              )}
            </div>

            {(srsStats.due > 0 || srsStats.scheduled > 0) && (
              <div className="srs-stats">
                <span className="srs-stat due">待複習 {srsStats.due}</span>
                <span className="srs-stat fresh">未學 {srsStats.fresh}</span>
                <span className="srs-stat scheduled">已排程 {srsStats.scheduled}</span>
              </div>
            )}

            {/* Level accuracy chart */}
            {levelStats.some(s => s.attempts > 0) && (
              <div className="home-section">
                <h3>各級正確率</h3>
                <div className="level-chart">
                  {levelStats.map(s => (
                    <div key={s.level} className="chart-row">
                      <span className="chart-label">{s.level}</span>
                      <div className="chart-bar-bg">
                        <div
                          className="chart-bar-fill"
                          style={{
                            width: s.attempts > 0 ? `${Math.round(s.accuracy * 100)}%` : '0%',
                            background: LEVEL_COLORS[s.level],
                          }}
                        />
                      </div>
                      <span className="chart-value">
                        {s.attempts > 0 ? `${Math.round(s.accuracy * 100)}%` : '—'}
                      </span>
                      <span className="chart-detail">
                        {s.practiced}/{(grammarByLevel[s.level] || []).length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weakPoints.length > 0 && (
              <div className="home-section weak-section">
                <h3>需要加強的文法</h3>
                <div className="weak-list">
                  {weakPoints.slice(0, 5).map(w => {
                    const g = allGrammar.find(item => item.id === w.id)
                    return (
                      <div key={w.id} className="weak-item">
                        <span className={`level-badge small ${g?.level || ''}`}>{g?.level}</span>
                        <span className="weak-grammar">{g?.grammar || w.id}</span>
                        <span className="weak-stats">
                          ❌ {w.wrong} / ⭕ {w.correct}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Session history */}
            {sessionHistory.length > 0 && (
              <div className="home-section">
                <h3>練習歷史</h3>
                <div className="session-history">
                  {[...sessionHistory].reverse().slice(0, 10).map((s, i) => {
                    const d = new Date(s.date)
                    const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                    const pct = Math.round((s.correct / s.total) * 100)
                    return (
                      <div key={i} className="history-item">
                        <span className="history-date">{dateStr}</span>
                        <span className="history-levels">{s.levels.join(' ')}</span>
                        <span className={`history-score ${pct >= 70 ? 'good' : 'bad'}`}>
                          {s.correct}/{s.total} ({pct}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="home-section stats-section">
              <h3>整體進度</h3>
              <p>已練習 {Object.keys(progress).length} 條文法</p>
              {bookmarks.length > 0 && (
                <p>已收藏 {bookmarks.length} 條文法</p>
              )}
              {sessionHistory.length > 0 && (
                <p>共完成 {sessionHistory.length} 次測驗</p>
              )}
              {Object.keys(progress).length > 0 && (
                <button className="clear-btn" onClick={() => {
                  if (confirm('確定要清除所有練習紀錄嗎？（含歷史紀錄）')) clearProgress()
                }}>
                  清除紀錄
                </button>
              )}
            </div>
          </div>
        )}

        {page === 'quiz' && (
          <QuizSession
            key={quizKey}
            selectedLevels={selectedLevels}
            progress={progress}
            quizCount={quizCount}
            mode={mode}
            srsDue={srsDue}
            srsFresh={srsFresh}
            onRecord={stableRecord}
            onFinish={handleFinish}
          />
        )}

        {page === 'result' && sessionResults && (
          <ResultView
            results={sessionResults}
            progress={progress}
            onRestart={() => startQuiz(mode)}
            onHome={() => setPage('home')}
          />
        )}

        {page === 'browse' && (
          <GrammarBrowser
            selectedLevels={selectedLevels}
            progress={progress}
            bookmarks={bookmarks}
            toggleBookmark={toggleBookmark}
            isBookmarked={isBookmarked}
          />
        )}
      </main>
    </div>
  )
}
