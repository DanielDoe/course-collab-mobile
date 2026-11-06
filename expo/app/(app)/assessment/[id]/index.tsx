import { Redirect, useLocalSearchParams, usePathname } from "expo-router"
import { AssessmentDetailScreen } from "../../../../src/components/assessments/AssessmentDetailScreen"
import { AssessmentReportScreen } from "../../../../src/components/assessments/AssessmentReportScreen"
import { assessmentModuleRoute } from "../../../../src/components/assessments/assessment-navigation"
import {
  assessmentTakeHref,
  firstRouteParam,
  isAssessmentTakePath,
  parseAssessmentTakeAction,
  resolveAssessmentTakeQuizId,
} from "../../../../src/lib/route-params"

export default function AssessmentDetailRoute() {
  const pathname = usePathname()
  const { id, type, action, quizId: quizIdParam } = useLocalSearchParams<{
    id?: string | string[]
    type?: string | string[]
    action?: string | string[]
    quizId?: string | string[]
  }>()
  const idParam = firstRouteParam(id)?.toLowerCase()
  const assessmentType = firstRouteParam(type) ?? "quiz"

  if (idParam === "report" || pathname.includes("/assessment/report")) {
    return <AssessmentReportScreen />
  }

  if (idParam === "take" || isAssessmentTakePath(pathname)) {
    const quizId = resolveAssessmentTakeQuizId({ id, quizId: quizIdParam, pathname })
    if (quizId == null) {
      return <Redirect href={assessmentModuleRoute(assessmentType)} />
    }
    return <Redirect href={assessmentTakeHref(quizId, assessmentType, parseAssessmentTakeAction(action))} />
  }

  if (!idParam) {
    return <Redirect href={assessmentModuleRoute(assessmentType)} />
  }

  return <AssessmentDetailScreen />
}
