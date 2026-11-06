import { useEffect, useState } from "react"
import type { StudentSession } from "../lib/session"
import { studentAuthenticatedHeaders } from "../lib/student-api"
import { headersHaveStudentSessionProof } from "../lib/student-session-proof"
import { studentSessionHasAuthIdentity } from "../lib/student-content-context"

/** Wait until the student session can build authenticated API headers. */
export function useStudentSessionApiReady(session: StudentSession | null): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!session) {
      setReady(false)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const headers = await studentAuthenticatedHeaders(session)
        if (!cancelled) {
          setReady(headersHaveStudentSessionProof(headers) && studentSessionHasAuthIdentity(session))
        }
      } catch {
        if (!cancelled) setReady(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    session,
    session?.databaseId,
    session?.id,
    session?.section,
    session?.courseId,
    session?.universityId,
    session?.authIdentifier,
  ])

  return ready
}
