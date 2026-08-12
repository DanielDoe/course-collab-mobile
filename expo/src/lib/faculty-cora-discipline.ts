export type FacultyCoraDisciplineId =
  | "electrical_engineering"
  | "computer_science"
  | "psychology"
  | "mathematics"
  | "biology"
  | "business"
  | "general"

export type FacultyCoraDisciplineProfile = {
  id: FacultyCoraDisciplineId
  label: string
  conceptA: string
  conceptB: string
  conceptC: string
  assessmentWord: string
}

const DISCIPLINE_PROFILES: Record<FacultyCoraDisciplineId, FacultyCoraDisciplineProfile> = {
  electrical_engineering: {
    id: "electrical_engineering",
    label: "Electrical Engineering",
    conceptA: "Kirchhoff's laws",
    conceptB: "nodal analysis",
    conceptC: "circuit analysis",
    assessmentWord: "Homework",
  },
  computer_science: {
    id: "computer_science",
    label: "Computer Science",
    conceptA: "recursion",
    conceptB: "data structures",
    conceptC: "algorithm design",
    assessmentWord: "Programming assignment",
  },
  psychology: {
    id: "psychology",
    label: "Psychology",
    conceptA: "cognitive development",
    conceptB: "classical conditioning",
    conceptC: "research methods",
    assessmentWord: "Reflection assignment",
  },
  mathematics: {
    id: "mathematics",
    label: "Mathematics",
    conceptA: "integration techniques",
    conceptB: "proof writing",
    conceptC: "linear algebra",
    assessmentWord: "Problem set",
  },
  biology: {
    id: "biology",
    label: "Biology",
    conceptA: "cell signaling",
    conceptB: "genetics",
    conceptC: "metabolism",
    assessmentWord: "Lab report",
  },
  business: {
    id: "business",
    label: "Business",
    conceptA: "market analysis",
    conceptB: "financial statements",
    conceptC: "case study frameworks",
    assessmentWord: "Case assignment",
  },
  general: {
    id: "general",
    label: "General",
    conceptA: "core course concepts",
    conceptB: "key terminology",
    conceptC: "applied examples",
    assessmentWord: "Assignment",
  },
}

const DISCIPLINE_KEYWORDS: Array<{ id: FacultyCoraDisciplineId; patterns: RegExp[] }> = [
  {
    id: "electrical_engineering",
    patterns: [
      /\bece\b/i,
      /\bee\b/i,
      /\beleg\b/i,
      /\belectrical\b/i,
      /\bcircuit/i,
      /\bkirchhoff/i,
      /\bkcl\b/i,
      /\bkvl\b/i,
      /\bnodal\b/i,
      /\bmesh\b/i,
      /\bvoltage\b/i,
      /\bcurrent law/i,
    ],
  },
  {
    id: "computer_science",
    patterns: [
      /\bcs\b/i,
      /\bcomp(?:uter)? sci/i,
      /\bprogramming\b/i,
      /\bsoftware\b/i,
      /\brecursion\b/i,
      /\bdata struct/i,
      /\balgorithm/i,
      /\bpython\b/i,
      /\bjava\b/i,
      /\bc\+\+/i,
    ],
  },
  {
    id: "psychology",
    patterns: [
      /\bpsych/i,
      /\bcogniti/i,
      /\bbehavior/i,
      /\bconditioning\b/i,
      /\bclinical\b/i,
      /\btherapy\b/i,
      /\bdevelopmental\b/i,
    ],
  },
  {
    id: "mathematics",
    patterns: [
      /\bmath/i,
      /\bcalculus\b/i,
      /\bintegral/i,
      /\bderivative/i,
      /\bproof\b/i,
      /\blinear algebra\b/i,
      /\bstatistics\b/i,
    ],
  },
  {
    id: "biology",
    patterns: [/\bbio/i, /\bcell\b/i, /\bgenetic/i, /\becology\b/i, /\banatomy\b/i],
  },
  {
    id: "business",
    patterns: [/\bbusiness\b/i, /\bfinance\b/i, /\baccounting\b/i, /\bmarketing\b/i, /\bmba\b/i],
  },
]

function scoreDiscipline(haystack: string, id: FacultyCoraDisciplineId): number {
  const entry = DISCIPLINE_KEYWORDS.find((row) => row.id === id)
  if (!entry) return 0
  return entry.patterns.reduce((score, pattern) => score + (pattern.test(haystack) ? 1 : 0), 0)
}

export function inferFacultyCoraDiscipline(signals: string[]): FacultyCoraDisciplineProfile {
  const haystack = signals.filter(Boolean).join(" ").toLowerCase()
  let best: FacultyCoraDisciplineId = "general"
  let bestScore = 0

  for (const entry of DISCIPLINE_KEYWORDS) {
    const score = scoreDiscipline(haystack, entry.id)
    if (score > bestScore) {
      bestScore = score
      best = entry.id
    }
  }

  return DISCIPLINE_PROFILES[best]
}

export function facultyCoraDisciplineProfile(id: FacultyCoraDisciplineId): FacultyCoraDisciplineProfile {
  return DISCIPLINE_PROFILES[id]
}

export function pickTopic(topics: string[], fallback: string, index = 0): string {
  const cleaned = topics.map((topic) => topic.trim()).filter(Boolean)
  return cleaned[index] ?? fallback
}
