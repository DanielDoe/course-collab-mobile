import { useEffect, useRef } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { AppAlert } from "../lib/app-alert"
import { assessmentQuizApi } from "../lib/assessment-quiz/assessment-quiz-api"
import type { StudentSession } from "../lib/session"

type Options = {
  session: StudentSession | null
  /** Live attempt to attach violations to; null disables the guard. */
  attemptId: number | null
  /** False once the attempt is finalized / still loading. */
  enabled: boolean
}

/**
 * Records task-switching during a live assessment attempt.
 *
 * Backgrounding the app (app switcher, home, another app) is the native
 * equivalent of a browser tab switch, so it is logged against the attempt via
 * the same `log-violation` endpoint the web quiz-taker uses and the student is
 * warned on return. Only `background` counts — `inactive` fires for
 * notification-centre pulls, screenshots and the app-switcher preview, which
 * would produce false positives.
 */
export function useAssessmentFocusGuard({ session, attemptId, enabled }: Options) {
  const awaySinceRef = useRef<number | null>(null)
  const strikesRef = useRef(0)

  useEffect(() => {
    if (!enabled || !session || attemptId == null || !Number.isFinite(attemptId)) return

    let previous: AppStateStatus = AppState.currentState

    const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" && previous !== "background") {
        awaySinceRef.current = Date.now()
      } else if (next === "active" && previous === "background") {
        const startedAt = awaySinceRef.current
        awaySinceRef.current = null
        const awaySeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0
        strikesRef.current += 1
        const strikes = strikesRef.current

        void assessmentQuizApi
          .logViolation(session, {
            attemptId,
            type: "tab_switch",
            reason: "app_backgrounded",
            details: `Left the app for ${awaySeconds}s during the attempt (${strikes} time(s))`,
          })
          .catch(() => {
            /* telemetry is best-effort */
          })

        AppAlert.alert(
          "Stay in the assessment",
          `Leaving the app during an assessment is recorded and visible to your instructor. This is warning ${strikes}.`,
        )
      }
      previous = next
    })

    return () => subscription.remove()
  }, [enabled, session, attemptId])
}
