import { useLocalSearchParams } from "expo-router"
import { AssessmentQuizScreen } from "../../../../src/components/assessments/AssessmentQuizScreen"
import type { AssessmentTakeAction } from "../../../../src/constants/module-web-paths"

function parseTakeAction(value: string | undefined): AssessmentTakeAction {
  if (value === "continue" || value === "retake" || value === "start") return value
  return "start"
}

export default function AssessmentTakeRoute() {
  const { id, type, action } = useLocalSearchParams<{
    id: string
    type?: string
    action?: string
  }>()

  const quizId = Number(id)
  const assessmentType = typeof type === "string" ? type : "quiz"
  const takeAction = parseTakeAction(typeof action === "string" ? action : undefined)

  if (!Number.isFinite(quizId)) {
    return null
  }

  return (
    <AssessmentQuizScreen
      quizId={quizId}
      assessmentType={assessmentType}
      takeAction={takeAction}
    />
  )
}
