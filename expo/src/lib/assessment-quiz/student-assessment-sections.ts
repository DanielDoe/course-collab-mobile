import {
  DEFAULT_SECTION_CONFIG,
  type SectionConfig,
} from "../faculty-assessment-sections"

export type { SectionConfig }

export type QuestionSection = {
  sectionIndex: number
  title: string
  weightPercent: number
  startIndex: number
  endIndex: number
  questionIndices: number[]
}

export function parseAssessmentSectionConfig(
  raw: SectionConfig[] | string | null | undefined,
): SectionConfig[] | null {
  if (raw == null) return null
  if (Array.isArray(raw)) return raw.length > 0 ? raw : null
  if (typeof raw === "string") {
    const t = raw.trim()
    if (!t || t === "[]") return null
    try {
      const p = JSON.parse(t) as unknown
      if (!Array.isArray(p) || p.length === 0) return null
      return p as SectionConfig[]
    } catch {
      return null
    }
  }
  return null
}

function normalizeQuestionType(type: string): string {
  return (type || "mcq").toLowerCase().trim()
}

function getSectionIndexForQuestionType(questionType: string, config: SectionConfig[]): number {
  const normalized = normalizeQuestionType(questionType)
  for (let i = 0; i < config.length; i++) {
    const types = config[i].question_types.map((t) => t.toLowerCase())
    if (types.includes(normalized)) return i
  }
  return 0
}

function resolveQuestionOrder1Based<T extends { question_order?: number }>(
  question: T,
  arrayIndex: number,
): number {
  const order = question.question_order
  return typeof order === "number" && order > 0 ? order : arrayIndex + 1
}

export function groupQuestionsBySections<
  T extends { question_type?: string; question_order?: number },
>(questions: T[], sectionConfig?: SectionConfig[] | null): QuestionSection[] {
  const parsed = parseAssessmentSectionConfig(sectionConfig)
  const config = parsed && parsed.length > 0 ? parsed : DEFAULT_SECTION_CONFIG

  const usePositionBased = config.some(
    (c) => c.question_order_start != null && c.question_order_end != null,
  )

  const sections: QuestionSection[] = []
  const sectionMap = new Map<number, { indices: number[] }>()

  const sortedConfig = usePositionBased
    ? [...config]
        .filter((c) => c.question_order_start != null && c.question_order_end != null)
        .sort((a, b) => (a.question_order_start ?? 0) - (b.question_order_start ?? 0))
    : []

  const configForSection = usePositionBased && sortedConfig.length > 0 ? sortedConfig : config

  if (usePositionBased && sortedConfig.length > 0) {
    questions.forEach((q, idx) => {
      const questionOrder = resolveQuestionOrder1Based(q, idx)
      const sectionIdx = sortedConfig.findIndex(
        (c) =>
          questionOrder >= (c.question_order_start ?? 0) &&
          questionOrder <= (c.question_order_end ?? 0),
      )
      const resolvedIdx =
        sectionIdx >= 0
          ? sectionIdx
          : getSectionIndexForQuestionType(q.question_type || "mcq", configForSection)
      if (!sectionMap.has(resolvedIdx)) sectionMap.set(resolvedIdx, { indices: [] })
      sectionMap.get(resolvedIdx)!.indices.push(idx)
    })
  } else {
    questions.forEach((q, idx) => {
      const sectionIdx = getSectionIndexForQuestionType(q.question_type || "mcq", config)
      if (!sectionMap.has(sectionIdx)) sectionMap.set(sectionIdx, { indices: [] })
      sectionMap.get(sectionIdx)!.indices.push(idx)
    })
  }

  const sortedSectionIndices = Array.from(sectionMap.keys()).sort((a, b) => a - b)
  for (const sectionIdx of sortedSectionIndices) {
    const { indices } = sectionMap.get(sectionIdx)!
    const cfg = configForSection[sectionIdx] || config[0]
    sections.push({
      sectionIndex: sectionIdx,
      title: cfg.title,
      weightPercent: cfg.weight_percent,
      startIndex: indices[0]!,
      endIndex: indices[indices.length - 1]!,
      questionIndices: indices,
    })
  }

  return sections
}

export function getSectionForQuestionIndex(
  questionIndex: number,
  sections: QuestionSection[],
): QuestionSection | null {
  return (
    sections.find((s) => questionIndex >= s.startIndex && questionIndex <= s.endIndex) || null
  )
}

export function getSectionConfigForQuestionIndex(
  questionIndex: number,
  sections: QuestionSection[],
  parsedConfig: SectionConfig[] | null,
): SectionConfig | null {
  if (!parsedConfig?.length || !sections.length) return null
  const sec = sections.find((s) => questionIndex >= s.startIndex && questionIndex <= s.endIndex)
  if (!sec) return null
  return parsedConfig[sec.sectionIndex] ?? null
}
