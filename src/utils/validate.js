import { allGrammar, grammarByLevel } from '../data'

const REQUIRED_FIELDS = ['id', 'level', 'grammar', 'meaning', 'structure', 'explanation', 'examples', 'tags']
const EX_FIELDS = ['jp', 'reading', 'zh', 'blank', 'answer']
const JP_RE = /[぀-ゟ゠-ヿ一-鿿]/
const HIRA_RE = /[ぁ-ゟ]/
const ZH_RE = /[一-鿿]/

export function validateAllGrammar() {
  const issues = []
  const ids = new Set()

  for (const g of allGrammar) {
    const gid = g.id || '?'

    // Required fields
    for (const f of REQUIRED_FIELDS) {
      if (!(f in g)) issues.push({ id: gid, msg: `missing field "${f}"` })
    }

    // Duplicate ID
    if (ids.has(gid)) issues.push({ id: gid, msg: 'DUPLICATE ID' })
    ids.add(gid)

    // Level consistency
    const match = gid.match(/^n(\d)-/)
    if (match && g.level !== `N${match[1]}`) {
      issues.push({ id: gid, msg: `level "${g.level}" doesn't match ID prefix` })
    }

    // Empty string fields
    for (const f of ['grammar', 'meaning', 'structure', 'explanation']) {
      if (typeof g[f] === 'string' && g[f].trim().length === 0) {
        issues.push({ id: gid, msg: `"${f}" is empty` })
      }
    }

    // Tags
    if (!Array.isArray(g.tags) || g.tags.length === 0) {
      issues.push({ id: gid, msg: 'tags is empty' })
    }

    // Examples
    const exs = g.examples || []
    if (exs.length < 2) {
      issues.push({ id: gid, msg: `only ${exs.length} example(s)` })
    }

    exs.forEach((ex, j) => {
      for (const ef of EX_FIELDS) {
        if (!(ef in ex)) {
          issues.push({ id: gid, msg: `ex[${j}] missing "${ef}"` })
        } else if (typeof ex[ef] === 'string' && ex[ef].trim().length === 0) {
          issues.push({ id: gid, msg: `ex[${j}] "${ef}" is empty` })
        }
      }

      if (ex.blank && !ex.blank.includes('___')) {
        issues.push({ id: gid, msg: `ex[${j}] blank has no ___` })
      }

      if (ex.jp && !JP_RE.test(ex.jp)) {
        issues.push({ id: gid, msg: `ex[${j}] jp has no Japanese` })
      }

      if (ex.reading && !HIRA_RE.test(ex.reading)) {
        issues.push({ id: gid, msg: `ex[${j}] reading has no hiragana` })
      }

      if (ex.zh && !ZH_RE.test(ex.zh)) {
        issues.push({ id: gid, msg: `ex[${j}] zh has no Chinese` })
      }
    })
  }

  return {
    total: allGrammar.length,
    counts: Object.fromEntries(
      Object.entries(grammarByLevel).map(([k, v]) => [k, v.length])
    ),
    issues,
    ok: issues.length === 0,
  }
}

export function scheduleValidation(intervalMs = 30 * 60 * 1000) {
  function run() {
    const result = validateAllGrammar()
    if (!result.ok) {
      console.warn(
        `[Grammar Validator] ${result.issues.length} issue(s) found in ${result.total} items:`,
        result.issues
      )
    } else {
      console.log(
        `[Grammar Validator] All ${result.total} items OK (N5:${result.counts.N5} N4:${result.counts.N4} N3:${result.counts.N3} N2:${result.counts.N2} N1:${result.counts.N1})`
      )
    }
    return result
  }

  // Run immediately on startup
  const initial = run()

  // Schedule periodic checks
  const timer = setInterval(run, intervalMs)

  return { initial, stop: () => clearInterval(timer) }
}
