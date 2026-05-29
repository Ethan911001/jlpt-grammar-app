import { allGrammar } from '../data'
import { exportToObsidian, exportWeakPoints, downloadMarkdown } from '../utils/obsidianExport'

export default function ResultView({ results, progress, onRestart, onHome }) {
  const correctCount = results.filter(r => r.correct).length
  const total = results.length
  const percentage = Math.round((correctCount / total) * 100)

  function handleExportAll() {
    const content = exportToObsidian(allGrammar, progress)
    downloadMarkdown(content, `JLPT文法筆記_全部_${new Date().toISOString().slice(0, 10)}.md`)
  }

  function handleExportWeak() {
    const content = exportWeakPoints(allGrammar, progress)
    if (!content) {
      alert('目前沒有需要加強的文法！')
      return
    }
    downloadMarkdown(content, `JLPT文法_弱點複習_${new Date().toISOString().slice(0, 10)}.md`)
  }

  function handleExportSession() {
    const wrongItems = results.filter(r => !r.correct)
    if (wrongItems.length === 0) {
      alert('這次全部答對了！沒有需要匯出的錯題。')
      return
    }
    const grammarIds = wrongItems.map(r => r.grammarId)
    const items = allGrammar.filter(g => grammarIds.includes(g.id))
    const content = exportToObsidian(items, progress)
    downloadMarkdown(content, `JLPT文法_本次錯題_${new Date().toISOString().slice(0, 10)}.md`)
  }

  return (
    <div className="result-view">
      <h2>練習結果</h2>

      <div className="score-circle">
        <div className="score-number">{percentage}%</div>
        <div className="score-detail">{correctCount} / {total} 正確</div>
      </div>

      <div className="result-list">
        {results.map((r, i) => (
          <div key={i} className={`result-item ${r.correct ? 'correct' : 'wrong'}`}>
            <span className="result-marker">{r.correct ? '⭕' : '❌'}</span>
            <span className="result-grammar">{r.grammar || r.answer}</span>
            <span className={`level-badge small ${r.level}`}>{r.level}</span>
          </div>
        ))}
      </div>

      <div className="export-section">
        <h3>匯出到 Obsidian</h3>
        <p className="export-hint">匯出的 .md 檔案支援 Obsidian Spaced Repetition 插件格式</p>
        <div className="export-buttons">
          <button onClick={handleExportSession} className="export-btn">
            匯出本次錯題
          </button>
          <button onClick={handleExportWeak} className="export-btn">
            匯出弱點文法
          </button>
          <button onClick={handleExportAll} className="export-btn secondary">
            匯出全部文法筆記
          </button>
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={onRestart} className="primary-btn">再練一次</button>
        <button onClick={onHome} className="secondary-btn">回首頁</button>
      </div>
    </div>
  )
}
