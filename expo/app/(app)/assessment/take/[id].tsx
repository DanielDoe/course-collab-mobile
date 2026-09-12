import { Redirect, useLocalSearchParams, usePathname } from "expo-router"
import { assessmentModuleRoute } from "../../../../src/components/assessments/assessment-navigation"
import {
  assessmentTakeHref,
  firstRouteParam,
  parseAssessmentTakeAction,
  resolveAssessmentTakeQuizId,
} from "../../../../src/lib/route-params"

/** Legacy `/assessment/take/:id` — Expo [id] collision. Bounce to `/take/:id`. */
export default function LegacyAssessmentTakeRedirect() {
  const pathname = usePathname()
  const { id, type, action, quizId: quizIdParam } = useLocalSearchParams<{
    id?: string | string[]
    type?: string | string[]
    action?: string | string[]
    quizId?: string | string[]
  }>()
  const assessmentType = firstRouteParam(type) ?? "quiz"
  const quizId = resolveAssessmentTakeQuizId({ id, quizId: quizIdParam, pathname })
  if (quizId == null) {
    return <Redirect href={assessmentModuleRoute(assessmentType)} />
  }
  return <Redirect href={assessmentTakeHref(quizId, assessmentType, parseAssessmentTakeAction(action))} />
}
