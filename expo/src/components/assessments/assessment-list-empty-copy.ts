import type { QuizListRolloverPolicy } from "../../lib/student-api"
import type { AssessmentListKind } from "./assessment-config"

/** Empty-list copy. Closed-term notice is quiz/homework only (production start-quiz: mid/final follow instructor schedule). */
export function assessmentListEmptyCopy(
  kind: AssessmentListKind | string,
  policy?: Pick<QuizListRolloverPolicy, "show_closed_notice" | "academic_term_label"> | null,
  displayTitle?: string,
): { title: string; body: string } {
  const showClosed = policy?.show_closed_notice === true && (kind === "quiz" || kind === "homework")
  if (showClosed && policy) {
    const term = policy.academic_term_label?.trim() || "this term"
    if (kind === "homework") {
      return {
        title: "Homework is closed",
        body: `Homework for ${term} is closed. Check back when a new term opens and your instructor publishes new homework.`,
      }
    }
    return {
      title: "Quizzes are closed",
      body: `Quizzes for ${term} are closed. Check back when a new term opens and your instructor publishes new quizzes.`,
    }
  }

  const noun = (displayTitle ?? fallbackEmptyNoun(kind)).trim().toLowerCase()
  return {
    title: `No ${noun} yet`,
    body: "Check back when your instructor publishes new assessments.",
  }
}

function fallbackEmptyNoun(kind: AssessmentListKind | string): string {
  if (kind === "homework") return "homework"
  if (kind === "final") return "final exams"
  if (kind === "mid_semester") return "mid-semester"
  return "quizzes"
}
