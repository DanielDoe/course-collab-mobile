import type { InstructorScope } from "./instructor-content-api"
import {
  instructorApi,
  type ClassroomPointRow,
  type InstructorAssessmentResult,
  type InstructorBankQuestion,
} from "./instructor-api"
import { instructorAdminApi, type SubmissionDiagnosticsItem } from "./instructor-admin-api"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import type { FacultyCoraChatResponse } from "./faculty-cora-api"
import { getFacultyCoraContextFromMemory } from "./faculty-cora-context-store"
import { pickTopic } from "./faculty-cora-discipline"
import { buildFacultyCoraTeachingContext, type FacultyCoraTeachingContext } from "./faculty-cora-teaching-context"
import { matchesAny, matchesPrompt, moduleAction } from "./faculty-cora-offline-shared"

export type FacultyCoraExplainContext = FacultyCoraTeachingContext & {
  results: InstructorAssessmentResult[]
  bankQuestions: InstructorBankQuestion[]
  classroomPoints: ClassroomPointRow[]
  reviewItems: SubmissionDiagnosticsItem[]
  syncedAt: string
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function formatPercent(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${Math.round(value)}%`
}

function questionMatchesTerms(question: InstructorBankQuestion, terms: string[]): boolean {
  const haystack = [
    question.topic,
    stripHtml(question.question_text),
    question.explanation,
    question.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return terms.some((term) => haystack.includes(term.toLowerCase()))
}

function resultMatchesTerms(row: InstructorAssessmentResult, terms: string[]): boolean {
  const haystack = [row.assessment_title, row.quiz_title, row.assessment_type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return terms.some((term) => haystack.includes(term.toLowerCase()))
}

function extractConceptTerms(message: string): string[] {
  const normalized = message.toLowerCase()
  if (normalized.includes("kcl") || normalized.includes("kirchhoff")) {
    return ["kcl", "kirchhoff", "current law", "nodal", "mesh", "circuit"]
  }
  if (normalized.includes("recursion") || normalized.includes("recursive")) {
    return ["recursion", "recursive", "base case", "call stack"]
  }
  return []
}

function aiFlaggedPoints(points: ClassroomPointRow[]): ClassroomPointRow[] {
  return points.filter(
    (row) =>
      row.ai_suspicion === true ||
      (row.flagged_features?.length ?? 0) > 0 ||
      (row.authenticity_score != null && row.authenticity_score < 0.6) ||
      (row.ai_likelihood != null && row.ai_likelihood > 0.6),
  )
}

export async function buildFacultyCoraExplainContext(scope: InstructorScope): Promise<FacultyCoraExplainContext> {
  const [base, results, bankQuestions, classroomPoints, diagnostics] = await Promise.all([
    buildFacultyCoraTeachingContext(scope),
    instructorApi.getAssessmentResults(scope, { limit: 200 }).catch(() => [] as InstructorAssessmentResult[]),
    instructorApi.getQuestionBank(scope).catch(() => [] as InstructorBankQuestion[]),
    instructorApi.getClassroomPoints(scope, { limit: 120 }).catch(() => [] as ClassroomPointRow[]),
    scope.courseId != null
      ? instructorAdminApi.getSubmissionDiagnostics({ instructorId: scope.instructorId, courseId: scope.courseId }, 14).catch(() => null)
      : Promise.resolve(null),
  ])

  const reviewItems = (diagnostics?.recentItems ?? []).filter(
    (item) => item.requiresReview || item.issueKind === "requires_review",
  )

  return {
    ...base,
    results,
    bankQuestions,
    classroomPoints,
    reviewItems,
    syncedAt: new Date().toISOString(),
  }
}

function resolveConceptTerms(scope: InstructorScope, message: string): { label: string; terms: string[] } {
  const instructorContext = getFacultyCoraContextFromMemory(scope)
  const primaryConcept = instructorContext
    ? pickTopic(instructorContext.activeCourse.topics, instructorContext.discipline.conceptA, 0)
    : "core course concepts"
  const secondaryConcept = instructorContext
    ? pickTopic(instructorContext.activeCourse.topics, instructorContext.discipline.conceptB, 1)
    : "key terminology"

  const extracted = extractConceptTerms(message)
  if (extracted.length > 0) {
    return { label: message.match(/on ([^.?]+)/i)?.[1]?.trim() ?? primaryConcept, terms: extracted }
  }

  const terms = [primaryConcept, secondaryConcept]
    .flatMap((value) => value.toLowerCase().split(/\s+/))
    .filter((value) => value.length > 3)
  return { label: primaryConcept, terms: [primaryConcept, secondaryConcept, ...terms] }
}

function conceptQuestionsReply(scope: InstructorScope, ctx: FacultyCoraExplainContext, message: string): FacultyCoraChatResponse {
  const { label, terms } = resolveConceptTerms(scope, message)
  const bankHits = ctx.bankQuestions.filter((question) => questionMatchesTerms(question, terms))
  const resultHits = ctx.results.filter((row) => resultMatchesTerms(row, terms))
  const lowScores = resultHits.filter((row) => {
    const pct = row.percentage ?? row.score
    return pct != null && pct < 60 && !row.is_in_progress
  })

  const lines = [`**Why students miss ${label} questions**`, ""]

  if (bankHits.length > 0 || lowScores.length > 0) {
    lines.push(
      `Your course has **${bankHits.length}** related bank item${bankHits.length === 1 ? "" : "s"} and **${lowScores.length}** low-score attempt${lowScores.length === 1 ? "" : "s"} tied to this topic.`,
      "",
    )
    if (lowScores.length > 0) {
      lines.push("**Recent low scores**")
      for (const row of lowScores.slice(0, 4)) {
        lines.push(
          `- ${row.student_name} — ${row.assessment_title ?? row.quiz_title ?? "Assessment"} (${formatPercent(row.percentage ?? row.score)})`,
        )
      }
      lines.push("")
    }
  }

  const instructorContext = getFacultyCoraContextFromMemory(scope)
  const disciplineId = instructorContext?.discipline.id ?? "general"

  if (disciplineId === "electrical_engineering") {
    lines.push(
      "**Common misconceptions**",
      "- Sign errors: students pick reference directions inconsistently, so summed currents at a node don't cancel.",
      "- Treating branches as independent: they forget current into a node must equal current out.",
      "- Confusing KCL (currents at a node) with KVL (voltages around a loop).",
      "",
      "**Teaching moves**",
      "- Label every branch current direction before writing equations.",
      "- Use one worked node example, then a similar problem with different topology.",
    )
  } else if (disciplineId === "psychology") {
    lines.push(
      "**Common misconceptions**",
      "- Confusing correlation with causation in study examples.",
      "- Mixing up similar theories or theorists introduced in the same unit.",
      "- Under-explaining how research evidence supports a claim.",
      "",
      "**Teaching moves**",
      "- Use one contrasting case example in class.",
      "- Ask students to restate the concept in their own words before grading open responses.",
    )
  } else if (disciplineId === "computer_science") {
    lines.push(
      "**Common misconceptions**",
      "- Missing or incorrect base cases in recursive solutions.",
      "- Trying to unroll the entire call stack instead of trusting the subproblem.",
      "- Mixing recursion with iteration incorrectly.",
      "",
      "**Teaching moves**",
      "- Trace a small example on the board before adding complexity.",
      "- Pair one debugging exercise with one write-from-scratch exercise.",
    )
  } else {
    lines.push(
      "**Common misconceptions**",
      `- Students oversimplify **${label}** instead of using precise course vocabulary.`,
      "- They apply a memorized template without checking assumptions.",
      "- They skip intermediate reasoning steps on open-ended items.",
      "",
      "**Teaching moves**",
      "- Revisit the definition in lecture before the next assessment.",
      "- Add one scaffolded practice item with worked feedback.",
    )
  }

  if (bankHits.length > 0) {
    const sample = bankHits[0]
    lines.push("", `Sample bank item (ID ${sample.id}): "${stripHtml(sample.question_text).slice(0, 100)}…"`)
  }

  lines.push("", "Review related items in **Question Bank** and **Manage Results** for item-level misses.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "results",
    actions: [
      moduleAction("results", "Manage Results"),
      moduleAction("question-bank", "Question Bank"),
      moduleAction("student-progress", "Student Progress"),
    ],
  }
}

function secondaryConceptReply(scope: InstructorScope, ctx: FacultyCoraExplainContext, message: string): FacultyCoraChatResponse {
  const instructorContext = getFacultyCoraContextFromMemory(scope)
  const concept = instructorContext
    ? pickTopic(instructorContext.activeCourse.topics, instructorContext.discipline.conceptB, 1)
    : "this topic"
  const terms = extractConceptTerms(message).length > 0
    ? extractConceptTerms(message)
    : [concept, ...(instructorContext?.discipline.conceptB ? [instructorContext.discipline.conceptB] : [])]
  const bankHits = ctx.bankQuestions.filter((question) => questionMatchesTerms(question, terms))
  const practiceHits = ctx.strugglingStudents.filter((student) =>
    (student.topics_practiced ?? []).some((topic) => terms.some((term) => topic.toLowerCase().includes(term.toLowerCase()))),
  )
  const lowConceptResults = ctx.lowScoreResults.filter((row) => resultMatchesTerms(row, terms))

  const lines = [`**Common misconceptions on ${concept}**`, ""]

  if (bankHits.length > 0 || practiceHits.length > 0 || lowConceptResults.length > 0) {
    lines.push("**Signals from your course**")
    if (bankHits.length > 0) {
      lines.push(`- **${bankHits.length}** related question${bankHits.length === 1 ? "" : "s"} in the bank`)
    }
    if (practiceHits.length > 0) {
      const names = practiceHits
        .slice(0, 3)
        .map((s) => s.student_name ?? s.full_name ?? "Student")
        .join(", ")
      lines.push(`- **${practiceHits.length}** student${practiceHits.length === 1 ? "" : "s"} with weak practice on ${concept}${names ? ` (${names})` : ""}`)
    }
    if (lowConceptResults.length > 0) {
      lines.push(`- **${lowConceptResults.length}** low-score attempt${lowConceptResults.length === 1 ? "" : "s"} on related assessments`)
    }
    lines.push("")
  }

  lines.push(
    "**What students usually get wrong**",
    `- They oversimplify **${concept}** instead of using precise vocabulary.`,
    "- They apply memorized patterns without checking whether the prompt context changed.",
    "- They skip intermediate reasoning on open-ended items.",
    "",
    "**How to clarify in class**",
    "- Revisit one contrasting example before the next assessment.",
    "- Ask students to explain the concept without notes.",
    "- Assign one short retrieval exercise tied to this topic.",
  )

  const explained = bankHits.find((question) => question.explanation?.trim())
  if (explained?.explanation) {
    lines.push("", `From your bank (ID ${explained.id}): ${stripHtml(explained.explanation).slice(0, 160)}…`)
  }

  lines.push("", `Use **Manage Practice** and **Question Bank** to reinforce ${concept}.`)

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "practice",
    actions: [
      moduleAction("practice", "Manage Practice"),
      moduleAction("question-bank", "Question Bank"),
      moduleAction("office-hours", "Office Hours"),
    ],
  }
}

function gradingTrendReply(ctx: FacultyCoraExplainContext): FacultyCoraChatResponse {
  const { charts, stats, lowScoreResults } = ctx
  const trend = charts?.scoreTrend ?? []
  const submissions = charts?.submissionsOverTime ?? []
  const lines = ["**Grading trend from Results**", ""]

  if (trend.length >= 2) {
    const first = trend[0]
    const last = trend[trend.length - 1]
    const delta = Math.round((last?.avgScore ?? 0) - (first?.avgScore ?? 0))
    lines.push(
      `Class average moved from **${formatPercent(first?.avgScore)}** (${first?.week ?? "earlier"}) to **${formatPercent(last?.avgScore)}** (${last?.week ?? "recent"}) — a **${delta >= 0 ? "+" : ""}${delta}** point shift.`,
    )
    lines.push(`Recent weeks logged **${last?.attempts ?? 0}** graded attempt${last?.attempts === 1 ? "" : "s"}.`)
    lines.push("")

    if (delta <= -5) {
      lines.push(
        "**Likely drivers of a dip**",
        "- Harder assessment or new topic without enough scaffolding.",
        "- More incomplete or rushed attempts near a deadline.",
        "- A few high-weight items pulling the average down.",
      )
    } else if (delta >= 5) {
      lines.push(
        "**Likely drivers of improvement**",
        "- Review sessions or practice aligned with weak topics.",
        "- Students retaking after feedback on earlier attempts.",
        "- More consistent completion before due dates.",
      )
    } else {
      lines.push("Scores are relatively stable — watch individual assessments for hidden weak spots.")
    }
  } else {
    lines.push("Not enough weekly trend data yet. Open **Manage Results** once more attempts are graded.")
  }

  if (submissions.length >= 2) {
    const recent = submissions.slice(-3)
    const counts = recent.map((row) => row.count).join(", ")
    lines.push("", `Submission volume (recent periods): ${counts}.`)
  }

  if (lowScoreResults.length > 0) {
    const byTitle = new Map<string, number>()
    for (const row of lowScoreResults) {
      const title = row.assessment_title ?? row.quiz_title ?? "Assessment"
      byTitle.set(title, (byTitle.get(title) ?? 0) + 1)
    }
    const hotspots = [...byTitle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    if (hotspots.length > 0) {
      lines.push("", "**Assessments contributing to the trend**")
      for (const [title, count] of hotspots) {
        lines.push(`- ${title} — ${count} low attempt${count === 1 ? "" : "s"}`)
      }
    }
  }

  if (stats?.pendingIssues) {
    lines.push("", `${stats.pendingIssues} open submission issue${stats.pendingIssues === 1 ? "" : "s"} may also affect finalized averages.`)
  }

  lines.push("", "Drill into **Manage Results** or export from **Manage Reports**.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "results",
    actions: [
      moduleAction("results", "Manage Results"),
      moduleAction("reports", "Manage Reports"),
      moduleAction("student-progress", "Student Progress"),
    ],
  }
}

function aiFlaggedSubmissionReply(ctx: FacultyCoraExplainContext): FacultyCoraChatResponse {
  const { flaggedResults, classroomPoints, reviewItems } = ctx
  const aiPoints = aiFlaggedPoints(classroomPoints)
  const lines = ["**Why the AI flagged this submission**", ""]

  const hasSignals = flaggedResults.length > 0 || aiPoints.length > 0 || reviewItems.length > 0

  if (flaggedResults.length > 0) {
    lines.push("**Flagged assessment attempts**")
    for (const row of flaggedResults.slice(0, 4)) {
      lines.push(
        `- ${row.student_name} — ${row.assessment_title ?? row.quiz_title ?? "Assessment"} (${formatPercent(row.percentage ?? row.score)})`,
      )
    }
    lines.push("")
  }

  if (aiPoints.length > 0) {
    lines.push("**Classroom point submissions with AI signals**")
    for (const row of aiPoints.slice(0, 4)) {
      const features = row.flagged_features?.length ? row.flagged_features.join(", ") : null
      const reason = row.authorship_reasoning?.trim()
      lines.push(
        `- ${row.student_name ?? "Student"} — ${row.submission_title ?? row.reason ?? "Submission"}${row.authenticity_score != null ? ` (authenticity ${Math.round(row.authenticity_score * 100)}%)` : ""}`,
      )
      if (features) lines.push(`  Flagged features: ${features}`)
      if (reason) lines.push(`  Reasoning: ${reason.slice(0, 140)}${reason.length > 140 ? "…" : ""}`)
    }
    lines.push("")
  }

  if (reviewItems.length > 0) {
    lines.push("**Manual review queue**")
    for (const item of reviewItems.slice(0, 4)) {
      lines.push(
        `- ${item.studentName} — ${item.quizTitle} (${item.errorType.replace(/_/g, " ")})`,
      )
    }
    lines.push("")
  }

  if (!hasSignals) {
    lines.push(
      "No flagged attempts or AI authorship alerts in recent data.",
      "",
      "When a submission is flagged, Cora typically surfaces one or more of these patterns:",
    )
  } else {
    lines.push("**What the flags usually mean**")
  }

  lines.push(
    "- **Similarity / template overlap** — code or prose matches common solutions or prior submissions.",
    "- **Authorship mismatch** — writing style or structure differs sharply from the student's past work.",
    "- **Integrity timing** — submission completed unusually fast for problem complexity.",
    "- **Grading review** — auto-grader uncertainty or partial credit needs instructor confirmation.",
    "",
    "Open the attempt in **Manage Results** or **Submission Issues** before messaging the student.",
  )

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "results",
    actions: [
      moduleAction("results", "Manage Results"),
      moduleAction("submission-issues", "Submission Issues"),
      moduleAction("messages", "Messages"),
      moduleAction("student-support", "Student Support"),
    ],
  }
}

function genericExplainReply(): FacultyCoraChatResponse {
  return {
    reply: [
      "**Explain a concept or trend**",
      "",
      "I can clarify why students miss topics, common misconceptions, grading patterns, and AI flags:",
      "",
      "- KCL and circuit analysis errors",
      "- Recursion misconceptions",
      "- Grading trends from Results",
      "- Flagged submission reasoning",
      "",
      "Pick a starter prompt or describe what you'd like explained.",
    ].join("\n"),
    offline: true,
    actions: [
      moduleAction("results", "Manage Results"),
      moduleAction("student-progress", "Student Progress"),
      moduleAction("office-hours", "Office Hours"),
      moduleAction("messages", "Messages"),
    ],
  }
}

export async function buildFacultyCoraExplainOfflineChatReply(
  scope: InstructorScope,
  payload: {
    message: string
    capabilityId?: FacultyCoraCapabilityId
  },
): Promise<FacultyCoraChatResponse> {
  if (payload.capabilityId !== "explain") {
    return genericExplainReply()
  }

  let ctx: FacultyCoraExplainContext
  try {
    ctx = await buildFacultyCoraExplainContext(scope)
  } catch {
    return {
      reply:
        "I couldn't load course context right now. Open **Manage Results** or **Student Progress** for the latest performance data.",
      offline: true,
      actions: [
        moduleAction("results", "Manage Results"),
        moduleAction("student-progress", "Student Progress"),
      ],
    }
  }

  const message = payload.message

  if (
    matchesPrompt(message, ["why are students missing kcl questions"]) ||
    matchesAny(message, ["missing kcl", "kcl questions", "kirchhoff"])
  ) {
    return conceptQuestionsReply(scope, ctx, message)
  }

  if (
    matchesPrompt(message, ["explain common misconceptions on recursion"]) ||
    matchesAny(message, ["misconceptions on recursion", "recursion misconceptions", "recursive", "common misconceptions"])
  ) {
    return secondaryConceptReply(scope, ctx, message)
  }

  if (
    matchesPrompt(message, ["explain this grading trend from results"]) ||
    matchesAny(message, ["grading trend", "trend from results", "score trend"])
  ) {
    return gradingTrendReply(ctx)
  }

  if (
    matchesPrompt(message, ["explain why the ai flagged this submission"]) ||
    matchesAny(message, ["ai flagged", "flagged this submission", "why flagged"])
  ) {
    return aiFlaggedSubmissionReply(ctx)
  }

  return conceptQuestionsReply(scope, ctx, message)
}
