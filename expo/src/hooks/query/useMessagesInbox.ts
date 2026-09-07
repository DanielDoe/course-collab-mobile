import { useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { messagesApi, type MessagesAuth, type ThreadSummary } from "../../lib/messages-api"
import { normalizeThreadSummaries } from "../../lib/messages-thread-normalize"
import { applyLocalThreadStateToThreads, reconcileLocalThreadReadState } from "../../lib/messages-local-state"
import { facultyQueryScope, queryKeys, studentInboxScope, STALE_BY_RESOURCE } from "../../lib/query"
import { keepSameCoursePlaceholder } from "../../lib/query/same-course-placeholder"

type InboxData = { threads: ThreadSummary[] }

const EMPTY_THREADS: ThreadSummary[] = []

function messagesQueryKey(auth: MessagesAuth) {
  if (auth.kind === "student") {
    return queryKeys.student.messages.inbox(
      studentInboxScope({
        databaseId: auth.databaseId,
        courseId: auth.courseId,
        section: auth.section,
      }),
    )
  }
  return queryKeys.faculty.messages.inbox(facultyQueryScope({ id: auth.instructorId }, null))
}

const IDLE_INBOX_KEY = ["messages", "idle", "inbox"] as const

export function useMessagesInbox(auth: MessagesAuth | null) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(
    () => (auth ? messagesQueryKey(auth) : IDLE_INBOX_KEY),
    [auth],
  )
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await messagesApi.listThreads(auth!)
      const threads = normalizeThreadSummaries(data.threads ?? [])
      reconcileLocalThreadReadState(threads)
      return { threads: applyLocalThreadStateToThreads(threads) }
    },
    enabled: Boolean(auth),
    staleTime: STALE_BY_RESOURCE.messages,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
  })
  const hasData = query.data != null
  const setThreads = useCallback(
    (updater: (current: ThreadSummary[]) => ThreadSummary[]) => {
      queryClient.setQueryData<InboxData>(queryKey, (current) => ({
        threads: updater(current?.threads ?? EMPTY_THREADS),
      }))
    },
    [queryClient, queryKey],
  )
  return {
    threads: query.data?.threads ?? EMPTY_THREADS,
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
    setThreads,
  }
}
