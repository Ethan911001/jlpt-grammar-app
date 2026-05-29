import { useState, useEffect } from 'react'
import { grammarByLevel, levels, allGrammar } from '../data'

function speak(text) {
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = 0.85
  speechSynthesis.speak(u)
}

export default function GrammarBrowser({ selectedLevels, progress, bookmarks, toggleBookmark, isBookmarked }) {
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [browseLevels, setBrowseLevels] = useState(selectedLevels)
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function toggleLevel(level) {
    if (browseLevels.includes(level)) {
      if (browseLevels.length > 1) setBrowseLevels(browseLevels.filter(l => l !== level))
    } else {
      setBrowseLevels([...browseLevels, level])
    }
  }

  const items = browseLevels.flatMap(l => grammarByLevel[l] || [])
    .filter(g => {
      if (showBookmarksOnly && !isBookmarked(g.id)) return false
      if (!search) return true
      return g.grammar.includes(search) ||
        g.meaning.includes(search) ||
        g.tags.some(t => t.includes(search))
    })

  return (
    <div className="grammar-browser">
      <div className="browse-level-selector">
        {levels.map(level => (
          <button
            key={level}
            className={`level-btn ${level} ${browseLevels.includes(level) ? 'active' : ''}`}
            onClick={() => toggleLevel(level)}
          >
            {level}
            <span className="level-count">{(grammarByLevel[level] || []).length}</span>
          </button>
        ))}
        <button
          className={`level-btn ${browseLevels.length === levels.length ? 'active' : ''}`}
          onClick={() => setBrowseLevels(browseLevels.length === levels.length ? [levels[0]] : [...levels])}
        >
          全部
        </button>
        <button
          className={`level-btn bookmark-filter ${showBookmarksOnly ? 'active' : ''}`}
          onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
          title="只顯示收藏"
        >
          ★ {bookmarks.length}
        </button>
      </div>

      <input
        type="text"
        placeholder="搜尋文法、意思、標籤..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="search-input"
      />
      <div className="grammar-count">{items.length} 條文法</div>

      <div className="grammar-list">
        {items.map(g => {
          const stats = progress[g.id]
          const expanded = expandedId === g.id
          const bookmarked = isBookmarked(g.id)
          return (
            <div key={g.id} className="grammar-item">
              <div className="grammar-header" onClick={() => setExpandedId(expanded ? null : g.id)}>
                <span className={`level-badge small ${g.level}`}>{g.level}</span>
                <span className="grammar-title">{g.grammar}</span>
                <span className="grammar-meaning">{g.meaning}</span>
                {stats && (
                  <span className={`accuracy ${stats.correct / (stats.correct + stats.wrong) >= 0.7 ? 'good' : 'bad'}`}>
                    {Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)}%
                  </span>
                )}
                <button
                  className={`bookmark-btn ${bookmarked ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleBookmark(g.id) }}
                  title={bookmarked ? '取消收藏' : '加入收藏'}
                >
                  {bookmarked ? '★' : '☆'}
                </button>
              </div>
              {expanded && (
                <div className="grammar-detail">
                  <p><strong>接續：</strong>{g.structure}</p>
                  <p><strong>解說：</strong>{g.explanation}</p>
                  <div className="examples">
                    {g.examples.map((ex, i) => (
                      <div key={i} className="example">
                        <div className="example-jp-row">
                          <p className="example-jp">{ex.jp}</p>
                          <button
                            className="speak-btn"
                            onClick={(e) => { e.stopPropagation(); speak(ex.jp) }}
                            title="朗讀"
                          >
                            🔊
                          </button>
                        </div>
                        <p className="example-reading">{ex.reading}</p>
                        <p className="example-zh">{ex.zh}</p>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const similar = allGrammar.filter(other =>
                      other.id !== g.id &&
                      other.tags.some(t => g.tags.includes(t)) &&
                      other.level === g.level
                    ).slice(0, 3)
                    if (similar.length === 0) return null
                    return (
                      <div className="similar-grammar">
                        <strong>相似文法：</strong>
                        {similar.map(s => (
                          <span
                            key={s.id}
                            className="similar-item"
                            onClick={(e) => { e.stopPropagation(); setExpandedId(s.id) }}
                          >
                            {s.grammar} <span className="similar-meaning">{s.meaning}</span>
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                  <div className="tags">
                    {g.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showTop && (
        <button
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="回到最上緣"
          aria-label="回到最上緣"
        >
          ↑
        </button>
      )}
    </div>
  )
}
