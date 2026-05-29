import { useState, useCallback } from 'react'

const STORAGE_KEY = 'jlpt-grammar-progress'
const BOOKMARK_KEY = 'jlpt-grammar-bookmarks'
const HISTORY_KEY = 'jlpt-grammar-sessions'
const SRS_KEY = 'jlpt-grammar-srs'
const GOAL_KEY = 'jlpt-grammar-daily-goal'

const DAY_MS = 24 * 60 * 60 * 1000

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// Local-date key (YYYY-M-D) for day-level grouping, ignoring time of day.
function dayKey(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
}

// SM-2 (simplified, binary correct/wrong) spaced-repetition scheduler.
// Returns the next SRS card state for a grammar item.
function computeSrs(prev, correct) {
  let { ease = 2.5, interval = 0, reps = 0, lapses = 0 } = prev || {}
  if (correct) {
    reps += 1
    if (reps === 1) interval = 1
    else if (reps === 2) interval = 3
    else interval = Math.max(1, Math.round(interval * ease))
    ease = Math.min(3.0, ease + 0.1)
  } else {
    reps = 0
    lapses += 1
    interval = 0 // becomes due immediately for re-review
    ease = Math.max(1.3, ease - 0.2)
  }
  const now = Date.now()
  return {
    ease,
    interval,
    reps,
    lapses,
    last: new Date(now).toISOString(),
    due: new Date(now + interval * DAY_MS).toISOString(),
  }
}

export function useProgress() {
  const [progress, setProgress] = useState(() => load(STORAGE_KEY, {}))
  const [bookmarks, setBookmarks] = useState(() => load(BOOKMARK_KEY, []))
  const [sessionHistory, setSessionHistory] = useState(() => load(HISTORY_KEY, []))
  const [srs, setSrs] = useState(() => load(SRS_KEY, {}))
  const [dailyGoal, setDailyGoalState] = useState(() => load(GOAL_KEY, 20))

  const record = useCallback((grammarId, correct, mode) => {
    setProgress(prev => {
      const entry = prev[grammarId] || { correct: 0, wrong: 0, history: [] }
      const updated = {
        ...prev,
        [grammarId]: {
          correct: entry.correct + (correct ? 1 : 0),
          wrong: entry.wrong + (correct ? 0 : 1),
          history: [
            ...entry.history.slice(-49),
            { date: new Date().toISOString(), correct, mode }
          ]
        }
      }
      save(STORAGE_KEY, updated)
      return updated
    })
    // Update spaced-repetition schedule for this item
    setSrs(prev => {
      const updated = { ...prev, [grammarId]: computeSrs(prev[grammarId], correct) }
      save(SRS_KEY, updated)
      return updated
    })
  }, [])

  const recordSession = useCallback((results) => {
    const session = {
      date: new Date().toISOString(),
      total: results.length,
      correct: results.filter(r => r.correct).length,
      levels: [...new Set(results.map(r => r.level))],
    }
    setSessionHistory(prev => {
      const next = [...prev, session].slice(-50) // keep last 50 sessions
      save(HISTORY_KEY, next)
      return next
    })
  }, [])

  const getStats = useCallback((grammarId) => {
    return progress[grammarId] || { correct: 0, wrong: 0, history: [] }
  }, [progress])

  const getWeakPoints = useCallback(() => {
    return Object.entries(progress)
      .filter(([, stats]) => stats.wrong > 0)
      .sort(([, a], [, b]) => {
        const ratioA = a.wrong / (a.correct + a.wrong)
        const ratioB = b.wrong / (b.correct + b.wrong)
        return ratioB - ratioA
      })
      .map(([id, stats]) => ({ id, ...stats }))
  }, [progress])

  const getLevelStats = useCallback(() => {
    const levels = ['N5', 'N4', 'N3', 'N2', 'N1']
    return levels.map(level => {
      const entries = Object.entries(progress).filter(([id]) => id.startsWith(level.toLowerCase()))
      const total = entries.length
      const correct = entries.reduce((sum, [, s]) => sum + s.correct, 0)
      const wrong = entries.reduce((sum, [, s]) => sum + s.wrong, 0)
      const attempts = correct + wrong
      return { level, practiced: total, correct, wrong, attempts, accuracy: attempts > 0 ? correct / attempts : 0 }
    })
  }, [progress])

  // Split a pool of grammar items into those due for review now vs. never-seen.
  // `due` is sorted most-overdue first; `fresh` keeps pool order.
  const getDueItems = useCallback((pool) => {
    const now = Date.now()
    const due = []
    const fresh = []
    for (const g of pool) {
      const s = srs[g.id]
      if (!s) {
        fresh.push(g)
      } else if (new Date(s.due).getTime() <= now) {
        due.push({ g, dueTime: new Date(s.due).getTime() })
      }
    }
    due.sort((a, b) => a.dueTime - b.dueTime)
    return { due: due.map(d => d.g), fresh }
  }, [srs])

  // Counts for the home screen: how many items are due / new / scheduled.
  const getSrsStats = useCallback((pool) => {
    const now = Date.now()
    let due = 0, fresh = 0, scheduled = 0
    for (const g of pool) {
      const s = srs[g.id]
      if (!s) fresh++
      else if (new Date(s.due).getTime() <= now) due++
      else scheduled++
    }
    return { due, fresh, scheduled, total: pool.length }
  }, [srs])

  // === Daily goal & streak ===
  const setDailyGoal = useCallback((n) => {
    save(GOAL_KEY, n)
    setDailyGoalState(n)
  }, [])

  // Number of questions answered today (summed across today's sessions).
  const getTodayCount = useCallback(() => {
    const today = dayKey(Date.now())
    return sessionHistory
      .filter(s => dayKey(s.date) === today)
      .reduce((sum, s) => sum + s.total, 0)
  }, [sessionHistory])

  // Consecutive days (ending today, or yesterday if today not yet practiced)
  // with at least one completed session.
  const getStreak = useCallback(() => {
    const days = new Set(sessionHistory.map(s => dayKey(s.date)))
    if (days.size === 0) return 0
    const d = new Date()
    if (!days.has(dayKey(d))) {
      // Today not done yet — streak is still alive only if yesterday was done.
      d.setDate(d.getDate() - 1)
      if (!days.has(dayKey(d))) return 0
    }
    let streak = 0
    while (days.has(dayKey(d))) {
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }, [sessionHistory])

  // === Mistake notebook ===
  // Grammar items whose most recent answer was wrong (drops out once re-answered
  // correctly). Sorted most-recently-missed first.
  const getMistakes = useCallback(() => {
    return Object.entries(progress)
      .filter(([, s]) => s.history.length > 0 && !s.history[s.history.length - 1].correct)
      .map(([id, s]) => ({
        id,
        correct: s.correct,
        wrong: s.wrong,
        recentWrong: s.history.slice(-5).filter(h => !h.correct).length,
        lastDate: s.history[s.history.length - 1].date,
      }))
      .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate))
  }, [progress])

  // === Backup / restore ===
  const exportData = useCallback(() => ({
    app: 'jlpt-grammar',
    version: 1,
    exportedAt: new Date().toISOString(),
    progress,
    srs,
    bookmarks,
    sessions: sessionHistory,
    dailyGoal,
  }), [progress, srs, bookmarks, sessionHistory, dailyGoal])

  const importData = useCallback((data) => {
    if (!data || typeof data !== 'object') return false
    if (data.app && data.app !== 'jlpt-grammar') return false
    if (data.progress && typeof data.progress === 'object') {
      save(STORAGE_KEY, data.progress); setProgress(data.progress)
    }
    if (data.srs && typeof data.srs === 'object') {
      save(SRS_KEY, data.srs); setSrs(data.srs)
    }
    if (Array.isArray(data.bookmarks)) {
      save(BOOKMARK_KEY, data.bookmarks); setBookmarks(data.bookmarks)
    }
    if (Array.isArray(data.sessions)) {
      save(HISTORY_KEY, data.sessions); setSessionHistory(data.sessions)
    }
    if (typeof data.dailyGoal === 'number') {
      save(GOAL_KEY, data.dailyGoal); setDailyGoalState(data.dailyGoal)
    }
    return true
  }, [])

  const clearProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(HISTORY_KEY)
    localStorage.removeItem(SRS_KEY)
    setProgress({})
    setSessionHistory([])
    setSrs({})
  }, [])

  const toggleBookmark = useCallback((grammarId) => {
    setBookmarks(prev => {
      const next = prev.includes(grammarId)
        ? prev.filter(id => id !== grammarId)
        : [...prev, grammarId]
      save(BOOKMARK_KEY, next)
      return next
    })
  }, [])

  const isBookmarked = useCallback((grammarId) => {
    return bookmarks.includes(grammarId)
  }, [bookmarks])

  return {
    progress, record, getStats, getWeakPoints, clearProgress,
    bookmarks, toggleBookmark, isBookmarked,
    sessionHistory, recordSession, getLevelStats,
    srs, getDueItems, getSrsStats,
    dailyGoal, setDailyGoal, getTodayCount, getStreak,
    getMistakes, exportData, importData,
  }
}
