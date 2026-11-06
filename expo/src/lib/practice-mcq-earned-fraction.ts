import { getQuestionOptions } from "./assessment-quiz/assessment-answer-mapper"
import { resolveMcqEarnedFractionForSubmission } from "./lecture-sample-practice-grading"
import { asAssessmentQuestion } from "./practice-question-types"
import { isMultiSelectType, type PracticeQuestion } from "./practice-session"

export function resolvePracticeQuestionMcqEarnedFraction(
  question: PracticeQuestion,
  selectedLetter: string,
  selectedLetters: string[],
): number | undefined {
  const assessment = asAssessmentQuestion(question)
  const options = getQuestionOptions(assessment).map((option) => ({
    id: option.letter,
    text: option.text,
  }))
  const qType = question.question_type.toLowerCase()
  const letters = isMultiSelectType(qType)
    ? selectedLetters.map((letter) => letter.toUpperCase()).filter(Boolean)
    : selectedLetter.trim()
      ? [selectedLetter.trim().toUpperCase()]
      : []

  return resolveMcqEarnedFractionForSubmission({
    questionType: qType,
    options,
    correctAnswer: question.correct_answer,
    selectedLetters: letters,
  })
}
