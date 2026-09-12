import { Redirect, useLocalSearchParams, usePathname } from "expo-router"
import { AssessmentQuizScreen } from "../../../src/components/assessments/AssessmentQuizScreen"
import { assessmentModuleRoute } from "../../../src/components/assessments/assessment-navigation"
import {
  firstRouteParam,
  parseAssessmentTakeAction,
  resolveAssessmentTakeQuizId,
} from "../../../src/lib/route-params"

export default function AssessmentTakeRoute() {
  const pathname = usePathname()
  const { id, type, action, quizId: quizIdParam } = useLocalSearchParams<{
    id?: string | string[]
    type?: string | string[]
    action?: string | string[]
    quizId?: string | string[]
  }>()

  const quizId = resolveAssessmentTakeQuizId({ id, quizId: quizIdParam, pathname })
  const assessmentType = firstRouteParam(type) ?? "quiz"
  const takeAction = parseAssessmentTakeAction(action)

  if (quizId == null) {
    return <Redirect href={assessmentModuleRoute(assessmentType)} />
  }

  return (
    <AssessmentQuizScreen
      quizId={quizId}
      assessmentType={assessmentType}
      takeAction={takeAction}
    />
  )
}
