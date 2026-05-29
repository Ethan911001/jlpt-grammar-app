import { useState, useCallback } from 'react'

const STORAGE_KEY = 'jlpt-grammar-progress'
const BOOKMARK_KEY = 'jlpt-grammar-bookmarks'
const HISTORY_KEY = 'jlpt-grammar-sessions'
const SRS_KEY = 'jlpt-grammar-srs'

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
  }
}
