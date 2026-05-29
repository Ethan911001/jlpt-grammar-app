export function exportToObsidian(grammarItems, progress) {
  const lines = [
    '# 日文文法複習筆記',
    '',
    `> 匯出時間：${new Date().toLocaleString('zh-TW')}`,
    '',
    '---',
    ''
  ]

  for (const item of grammarItems) {
    const stats = progress[item.id]
    const accuracy = stats
      ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
      : null

    lines.push(`## ${item.grammar}`)
    lines.push('')
    lines.push(`**級別**：${item.level}　**意思**：${item.meaning}`)
    lines.push('')
    lines.push(`**接續**：${item.structure}`)
    lines.push('')
    lines.push(`**說明**：${item.explanation}`)
    lines.push('')

    if (stats) {
      const icon = accuracy >= 80 ? '✅' : accuracy >= 50 ? '⚠️' : '❌'
      lines.push(`**練習紀錄**：${icon} 正確率 ${accuracy}%（${stats.correct}/${stats.correct + stats.wrong}）`)
      lines.push('')
    }

    lines.push('### 例句')
    lines.push('')
    for (const ex of item.examples) {
      lines.push(`- ${ex.jp}`)
      lines.push(`  - 讀音：${ex.reading}`)
      lines.push(`  - 中文：${ex.zh}`)
    }
    lines.push('')

    // Obsidian Spaced Repetition plugin format
    lines.push('### Flashcard')
    lines.push('')
    lines.push(`${item.grammar}（${item.level}）`)
    lines.push('?')
    lines.push(`${item.meaning}　${item.structure}`)
    lines.push('')
    lines.push(`${item.examples[0].jp} → ${item.examples[0].zh}`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportWeakPoints(grammarItems, progress) {
  const weak = Object.entries(progress)
    .filter(([, stats]) => {
      const ratio = stats.wrong / (stats.correct + stats.wrong)
      return ratio > 0.3
    })
    .map(([id]) => id)

  const weakGrammar = grammarItems.filter(g => weak.includes(g.id))
  if (weakGrammar.length === 0) return null
  return exportToObsidian(weakGrammar, progress)
}
