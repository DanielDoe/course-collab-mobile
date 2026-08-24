import { useEffect, useRef, useState, type ReactNode } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { QueryClientProvider } from "@tanstack/react-query"
import { useSession } from "./SessionProvider"
import { getQueryClient } from "../lib/query/client"
import { clearPersistedQueryCache, hydratePersistedQueries, persistScopedQueries } from "../lib/query/persist"
import { prefetchFacultyPhase2, prefetchStudentPhase1 } from "../lib/query/prefetch"
import { queryScopeFromSession, scopesEqual, type QueryScope } from "../lib/query/scope"
import { clearInMemoryQueryCache, removePrivilegedQueries } from "../lib/query/security"
import {
  getFacultyQueryCourseId,
  setFacultyQueryCourseId,
  subscribeFacultyQueryCourse,
} from "../lib/query/faculty-course"
import { getStoredFacultyCourseId } from "../lib/faculty-course-storage"
import { QueryUndoHost } from "../components/query/QueryUndoHost"

const queryClient = getQueryClient()

export function QueryProvider({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const [facultyCourseId, setFacultyCourseId] = useState<number | null>(getFacultyQueryCourseId)
  const scopeRef = useRef<QueryScope | null>(null)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => subscribeFacultyQueryCourse(setFacultyCourseId), [])

  useEffect(() => {
    if (session?.portal !== "faculty") {
      setFacultyQueryCourseId(null)
      return
    }
    void getStoredFacultyCourseId(session.id).then((id) => {
      if (id != null) setFacultyQueryCourseId(id)
    })
  }, [session])

  useEffect(() => {
    const nextScope = session ? queryScopeFromSession(session, facultyCourseId) : null
    const previous = scopeRef.current
    if (scopesEqual(previous, nextScope)) return

    if (previous && !scopesEqual(previous, nextScope)) {
      const userChanged = !nextScope || previous.userId !== nextScope.userId || previous.portal !== nextScope.portal
      if (userChanged) {
        void clearPersistedQueryCache(previous).catch(() => undefined)
        clearInMemoryQueryCache(queryClient)
        if (previous.portal === "faculty" || previous.portal === "admin") {
          removePrivilegedQueries(queryClient)
        }
      } else {
        void persistScopedQueries(queryClient, previous).catch(() => undefined)
      }
    }

    scopeRef.current = nextScope
    if (!nextScope || !session) {
      if (!nextScope) void clearPersistedQueryCache(previous ?? undefined).catch(() => undefined)
      return
    }

    void (async () => {
      await hydratePersistedQueries(queryClient, nextScope)
      if (session.portal === "student") {
        await prefetchStudentPhase1(queryClient, session)
      } else if (session.portal === "faculty" && nextScope.courseId != null) {
        await prefetchFacultyPhase2(queryClient, {
          instructorId: session.id,
          courseId: nextScope.courseId,
        })
      }
    })()
  }, [session, facultyCourseId])

  useEffect(() => {
    const persistSoon = () => {
      const scope = scopeRef.current
      if (!scope) return
      if (persistTimer.current) clearTimeout(persistTimer.current)
      persistTimer.current = setTimeout(() => {
        void persistScopedQueries(queryClient, scope).catch(() => undefined)
      }, 1200)
    }

    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success") persistSoon()
    })

    const onApp = (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        const scope = scopeRef.current
        if (scope) void persistScopedQueries(queryClient, scope).catch(() => undefined)
      }
    }
    const appSub = AppState.addEventListener("change", onApp)
    return () => {
      unsub()
      appSub.remove()
      if (persistTimer.current) clearTimeout(persistTimer.current)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <QueryUndoHost />
    </QueryClientProvider>
  )
}
