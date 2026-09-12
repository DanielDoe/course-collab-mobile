import { useCallback, useEffect, useState } from "react"
import { AppAlert } from "../lib/app-alert"
import {
  DEFAULT_ASSESSMENT_PLATFORM_ACCESS,
  assessmentPlatformBlockedMessage,
  extractAssessmentPlatformAccess,
  isAssessmentPlatformAllowed,
  type AssessmentPlatformAccess,
} from "../lib/assessment-platform-access"
import { studentApi } from "../lib/student-api"
import type { StudentSession } from "../lib/session"

export function useAssessmentPlatformAccess(session: StudentSession | null) {
  const [access, setAccess] = useState<AssessmentPlatformAccess>(DEFAULT_ASSESSMENT_PLATFORM_ACCESS)
  const [ready, setReady] = useState(!session)

  const load = useCallback(async () => {
    if (!session) {
      setReady(true)
      return
    }
    try {
      const raw = await studentApi.getCoursePolicies(session)
      setAccess(extractAssessmentPlatformAccess(raw))
    } catch {
      setAccess(DEFAULT_ASSESSMENT_PLATFORM_ACCESS)
    } finally {
      setReady(true)
    }
  }, [session])

  useEffect(() => {
    setReady(false)
    void load()
  }, [load])

  const canTakeOnMobile = useCallback(
    (kind: string | undefined | null, override?: unknown) =>
      isAssessmentPlatformAllowed(access, kind, "mobile", override),
    [access],
  )

  const confirmMobileAccess = useCallback(
    (kind: string | undefined | null, override?: unknown) => {
      if (canTakeOnMobile(kind, override)) return true
      AppAlert.alert("Use the website", assessmentPlatformBlockedMessage(kind, "mobile"))
      return false
    },
    [canTakeOnMobile],
  )

  return { access, ready, canTakeOnMobile, confirmMobileAccess, reload: load }
}
