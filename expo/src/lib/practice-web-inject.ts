import type { AppThemeTokens } from "../constants/app-themes"
import type { StudentSession } from "./session"
import { buildWebSessionInjectScript } from "./web-session-inject"
import type { PracticeQuestion } from "./practice-session"

/** Inject web session + practice quiz sessionStorage for WebView fallback. */
export function buildPracticeQuizInjectScript(
  session: StudentSession,
  attemptId: number,
  questions: PracticeQuestion[],
  theme?: AppThemeTokens,
  reviewOnly = false,
): string {
  const sessionScript = buildWebSessionInjectScript(session, { theme })
  const practiceScript = `
    (function () {
      try {
        sessionStorage.setItem('practiceAttemptId', ${JSON.stringify(String(attemptId || 0))});
        sessionStorage.setItem('practiceQuestions', ${JSON.stringify(JSON.stringify(questions))});
        sessionStorage.setItem('practiceReviewOnly', ${JSON.stringify(reviewOnly ? "1" : "0")});
      } catch (e) {}
    })();
    true;
  `
  return sessionScript + practiceScript
}
