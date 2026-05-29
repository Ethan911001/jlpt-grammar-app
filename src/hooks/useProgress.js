import { useState, useCallback } from 'react'

const STORAGE_KEY = 'jlpt-grammar-progress'
const BOOKMARK_KEY = 'jlpt-grammar-bookmarks'
const HISTORY_KEY = 'jlpt-grammar-sessions'

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

export function useProgress() {
  const [progress, setProgress] = useState(() => load(STORAGE_KEY, {}))
  const [bookmarks, setBookmarks] = useState(() => load(BOOKMARK_KEY, []))
  const [sessionHistory, setSessionHistory] = useState(() => load(HISTORY_KEY, []))

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

  const clearProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(HISTORY_KEY)
    setProgress({})
    setSessionHistory([])
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
  }
}
