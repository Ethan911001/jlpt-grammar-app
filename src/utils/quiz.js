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
  // Split Japanese sentence into meaningful chunks for reordering
  // Try splitting by particles and common breakpoints
  const parts = []
  let remaining = sentence

  // Remove trailing period/。
  remaining = remaining.replace(/[。．.]$/, '')

  // Split by common particles and markers, keeping them attached
  const regex = /([^はがをにでへともからまでよりなのか、]+[はがをにでへともからまでよりなのか、]?)/g
  let match
  while ((match = regex.exec(remaining)) !== null) {
    if (match[1].trim()) parts.push(match[1])
  }

  // If splitting didn't work well, fall back to roughly equal chunks
  if (parts.length < 3) {
    const len = remaining.length
    const chunkSize = Math.ceil(len / 4)
    const fallback = []
    for (let i = 0; i < len; i += chunkSize) {
      fallback.push(remaining.slice(i, i + chunkSize))
    }
    return fallback
  }

  // Merge tiny fragments
  const merged = []
  for (const p of parts) {
    if (merged.length > 0 && merged[merged.length - 1].length < 3) {
      merged[merged.length - 1] += p
    } else {
      merged.push(p)
    }
  }

  return merged.length >= 3 ? merged : parts
}

export function generateReorder(grammarItem) {
  const ex = grammarItem.examples[Math.floor(Math.random() * grammarItem.examples.length)]
  const sentence = ex.jp.replace(/[。．.]$/, '')
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
