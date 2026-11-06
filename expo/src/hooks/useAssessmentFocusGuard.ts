import { useEffect, useRef } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { AppAlert } from "../lib/app-alert"
import { assessmentQuizApi } from "../lib/assessment-quiz/assessment-quiz-api"
import type { AssessmentAntiCheatConfig } from "../lib/assessment-quiz/assessment-anti-cheat"
import type { StudentSession } from "../lib/session"

type Options = {
  session: StudentSession | null
  /** Live attempt to attach violations to; null disables the guard. */
  attemptId: number | null
  /** False once the attempt is finalized / still loading. */
  enabled: boolean
  antiCheat?: AssessmentAntiCheatConfig
  onMaxViolations?: () => void
}

/**
 * Records task-switching during a live assessment attempt.
 *
 * Backgrounding the app (app switcher, home, another app) is the native
 * equivalent of a browser tab switch, so it is logged against the attempt via
 * the same `log-violation` endpoint the web quiz-taker uses. Only `background`
 * counts — `inactive` fires for notification-centre pulls and would false-positive.
 */
export function useAssessmentFocusGuard({
  session,
  attemptId,
  enabled,
  antiCheat,
  onMaxViolations,
}: Options) {
  const awaySinceRef = useRef<number | null>(null)
  const strikesRef = useRef(0)
  const onMaxRef = useRef(onMaxViolations)
  onMaxRef.current = onMaxViolations

  useEffect(() => {
    if (!enabled || !session || attemptId == null || !Number.isFinite(attemptId)) return
    if (antiCheat && !antiCheat.trackTabSwitches) return

    let previous: AppStateStatus = AppState.currentState
    const warn = antiCheat?.warnOnTabSwitch ?? true
    const maxSwitches = antiCheat?.maxTabSwitches ?? 0
    const autoSubmit = antiCheat?.autoSubmitOnViolations ?? false

    const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" && previous !== "background") {
        awaySinceRef.current = Date.now()
      } else if (next === "active" && previous === "background") {
        const startedAt = awaySinceRef.current
        awaySinceRef.current = null
        const awaySeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0
        strikesRef.current += 1
        const strikes = strikesRef.current
        const atLimit = maxSwitches > 0 && strikes >= maxSwitches

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

        if (atLimit && autoSubmit) {
          AppAlert.alert(
            "Assessment submitted",
            "Leaving the app too many times reached the instructor's limit. Your attempt is being submitted.",
          )
          onMaxRef.current?.()
        } else if (warn) {
          const remaining =
            maxSwitches > 0 ? ` ${Math.max(0, maxSwitches - strikes)} warning(s) left.` : ""
          AppAlert.alert(
            "Stay in the assessment",
            `Leaving the app during an assessment is recorded and visible to your instructor. This is warning ${strikes}.${remaining}`,
          )
        }
      }
      previous = next
    })

    return () => subscription.remove()
  }, [enabled, session, attemptId, antiCheat])
}
