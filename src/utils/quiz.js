export function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function generateFillBlank(grammarItem) {
  const ex = grammarItem.examples[Math.floor(Math.random() * grammarItem.examples.length)]
  return {
    type: 'fill',
    grammarId: grammarItem.id,
    grammar: grammarItem.grammar,
    level: grammarItem.level,
    question: ex.blank,
    answer: ex.answer,
    hint: grammarItem.meaning,
    fullSentence: ex.jp,
    reading: ex.reading,
    translation: ex.zh,
    explanation: grammarItem.explanation,
  }
}

export function generateMultipleChoice(grammarItem, allGrammar) {
  const ex = grammarItem.examples[Math.floor(Math.random() * grammarItem.examples.length)]

  const distractors = shuffle(
    allGrammar.filter(g => g.id !== grammarItem.id)
  ).slice(0, 3)

  const choices = shuffle([
    { text: grammarItem.grammar, correct: true },
    ...distractors.map(d => ({ text: d.grammar, correct: false }))
  ])

  return {
    type: 'choice',
    grammarId: grammarItem.id,
    level: grammarItem.level,
    question: `以下哪個文法表示「${grammarItem.meaning}」？`,
    sentence: ex.jp,
    translation: ex.zh,
    choices,
    answer: grammarItem.grammar,
    explanation: grammarItem.explanation,
    structure: grammarItem.structure,
  }
}

export function generateMatching(grammarItems) {
  // Pick 4 items for a matching question
  const picked = shuffle(grammarItems).slice(0, 4)
  if (picked.length < 4) return null

  const pairs = picked.map(g => ({ grammar: g.grammar, meaning: g.meaning }))
  const shuffledRight = shuffle([...pairs])

  return {
    type: 'matching',
    grammarId: picked.map(g => g.id).join(','),
    level: picked[0].level,
    pairs,
    shuffledRight,
  }
}

function splitSentence(sentence) {
  // Remove trailing punctuation (。．.！？!?)
  const clean = sentence.replace(/[。．.！？!?]+$/, '')

  // Split after multi-char particles/markers first, then single-char particles
  // Order matters: longer patterns first to avoid partial matches
  const splitPoints = /(?<=(?:ながら|から|まで|けど|けれど|ので|のに|たら|ても|って|という|ところ|について|として|にとって|に対して|によって|において|、))/g
  let parts = clean.split(splitPoints).filter(p => p.length > 0)

  // If not enough parts, try splitting on single-char particles (は、が、を、に、で、へ、と、も)
  // but only after content (not inside words like ます、です)
  if (parts.length < 3) {
    const singleSplit = /(?<=.(?:は|が|を|に|で|へ|と|も)(?=[^぀-ゟー]))/g
    parts = clean.split(singleSplit).filter(p => p.length > 0)
  }

  // If still not enough, split by punctuation (、)
  if (parts.length < 3) {
    parts = clean.split(/(?<=、)/).filter(p => p.length > 0)
  }

  // Last resort: split into roughly equal chunks
  if (parts.length < 3) {
    const len = clean.length
    const chunkSize = Math.max(3, Math.ceil(len / 4))
    parts = []
    for (let i = 0; i < len; i += chunkSize) {
      parts.push(clean.slice(i, i + chunkSize))
    }
  }

  // Merge any fragments shorter than 2 chars into neighbors
  const merged = []
  for (const p of parts) {
    if (merged.length > 0 && merged[merged.length - 1].length < 2) {
      merged[merged.length - 1] += p
    } else {
      merged.push(p)
    }
  }
  // Check last fragment
  if (merged.length > 1 && merged[merged.length - 1].length < 2) {
    const last = merged.pop()
    merged[merged.length - 1] += last
  }

  // Verify: rejoined must equal original
  if (merged.join('') !== clean) {
    // Fallback to safe equal chunks
    const len = clean.length
    const chunkSize = Math.max(3, Math.ceil(len / 4))
    const safe = []
    for (let i = 0; i < len; i += chunkSize) {
      safe.push(clean.slice(i, i + chunkSize))
    }
    return safe
  }

  // Return merged result — if < 3 parts, generateReorder will skip this sentence
  return merged
}

export function generateReorder(grammarItem) {
  const ex = grammarItem.examples[Math.floor(Math.random() * grammarItem.examples.length)]
  const sentence = ex.jp.replace(/[。．.！？!?]+$/, '')
  const parts = splitSentence(sentence)

  if (parts.length < 3) return null

  return {
    type: 'reorder',
    grammarId: grammarItem.id,
    grammar: grammarItem.grammar,
    level: grammarItem.level,
    correctOrder: sentence,
    shuffledParts: shuffle(parts),
    reading: ex.reading,
    translation: ex.zh,
    explanation: grammarItem.explanation,
  }
}

// Spaced-repetition quiz: tests due items first, then never-seen items, then
// fills any remainder with random picks. Each item maps to one direct question
// (fill / choice / reorder) — matching is skipped so the review stays focused
// on the specific scheduled item.
export function generateSrsQuiz(dueItems, freshItems, pool, allGrammar, count = 10) {
  const ordered = [...dueItems, ...freshItems]
  // Fill remainder with random items not already included
  if (ordered.length < count) {
    const usedIds = new Set(ordered.map(g => g.id))
    const filler = shuffle(pool.filter(g => !usedIds.has(g.id)))
    ordered.push(...filler.slice(0, count - ordered.length))
  }
  const selected = ordered.slice(0, count)

  const questions = []
  for (const item of selected) {
    const rand = Math.random()
    if (rand < 0.4) {
      questions.push(generateFillBlank(item))
    } else if (rand < 0.7) {
      questions.push(generateMultipleChoice(item, allGrammar))
    } else {
      const reorder = generateReorder(item)
      questions.push(reorder || generateFillBlank(item))
    }
  }
  return questions
}

function pickQuestionType(item, allGrammar, pool) {
  const rand = Math.random()
  if (rand < 0.3) {
    return generateFillBlank(item)
  } else if (rand < 0.55) {
    return generateMultipleChoice(item, allGrammar)
  } else if (rand < 0.75) {
    const reorder = generateReorder(item)
    if (reorder) return reorder
    return generateFillBlank(item) // fallback
  } else {
    const matching = generateMatching(pool)
    if (matching) return matching
    return generateMultipleChoice(item, allGrammar) // fallback
  }
}

export function generateQuiz(grammarList, allGrammar, count = 10) {
  const selected = shuffle(grammarList).slice(0, count)
  const questions = []
  let matchingUsed = 0

  for (const item of selected) {
    const rand = Math.random()
    if (rand < 0.3) {
      questions.push(generateFillBlank(item))
    } else if (rand < 0.55) {
      questions.push(generateMultipleChoice(item, allGrammar))
    } else if (rand < 0.75) {
      const reorder = generateReorder(item)
      questions.push(reorder || generateFillBlank(item))
    } else if (matchingUsed < 2) {
      const matching = generateMatching(grammarList)
      if (matching) {
        questions.push(matching)
        matchingUsed++
      } else {
        questions.push(generateMultipleChoice(item, allGrammar))
      }
    } else {
      questions.push(generateMultipleChoice(item, allGrammar))
    }
  }

  return questions
}

export function generateWeakQuiz(grammarList, allGrammar, progress, count = 10) {
  const scored = grammarList.map(item => {
    const stats = progress[item.id]
    if (!stats) return { item, score: 0.5 }
    const total = stats.correct + stats.wrong
    const errorRate = stats.wrong / total
    return { item, score: errorRate }
  })

  scored.sort((a, b) => b.score - a.score)

  const weakCount = Math.ceil(count * 0.6)
  const randomCount = count - weakCount

  const weakPool = scored.slice(0, Math.max(weakCount * 2, 10))
  const restPool = scored.slice(weakPool.length)

  const selected = [
    ...shuffle(weakPool).slice(0, weakCount).map(s => s.item),
    ...shuffle(restPool).slice(0, randomCount).map(s => s.item),
  ].slice(0, count)

  const questions = []
  let matchingUsed = 0

  for (const item of shuffle(selected)) {
    const rand = Math.random()
    if (rand < 0.3) {
      questions.push(generateFillBlank(item))
    } else if (rand < 0.55) {
      questions.push(generateMultipleChoice(item, allGrammar))
    } else if (rand < 0.75) {
      const reorder = generateReorder(item)
      questions.push(reorder || generateFillBlank(item))
    } else if (matchingUsed < 2) {
      const matching = generateMatching(grammarList)
      if (matching) {
        questions.push(matching)
        matchingUsed++
      } else {
        questions.push(generateMultipleChoice(item, allGrammar))
      }
    } else {
      questions.push(generateMultipleChoice(item, allGrammar))
    }
  }

  return questions
}
