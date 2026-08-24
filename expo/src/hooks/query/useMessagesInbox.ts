import { useQuery, useQueryClient } from "@tanstack/react-query"
import { messagesApi, type MessagesAuth, type ThreadSummary } from "../../lib/messages-api"
import { applyLocalThreadStateToThreads, reconcileLocalThreadReadState } from "../../lib/messages-local-state"
import { facultyQueryScope, queryKeys, studentInboxScope, STALE_BY_RESOURCE } from "../../lib/query"

type InboxData = { threads: ThreadSummary[] }

function messagesQueryKey(auth: MessagesAuth) {
  if (auth.kind === "student") {
    return queryKeys.student.messages.inbox(studentInboxScope({ databaseId: auth.databaseId }))
  }
  return queryKeys.faculty.messages.inbox(facultyQueryScope({ id: auth.instructorId }, null))
}

export function useMessagesInbox(auth: MessagesAuth | null) {
  const queryClient = useQueryClient()
  const queryKey = auth ? messagesQueryKey(auth) : ["messages", "idle", "inbox"]
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await messagesApi.listThreads(auth!)
      const threads = data.threads ?? []
      reconcileLocalThreadReadState(threads)
      return { threads: applyLocalThreadStateToThreads(threads) }
    },
    enabled: Boolean(auth),
    staleTime: STALE_BY_RESOURCE.messages,
    placeholderData: (previous) => previous,
  })
  const hasData = query.data != null
  return {
    threads: query.data?.threads ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
    setThreads: (updater: (current: ThreadSummary[]) => ThreadSummary[]) => {
      queryClient.setQueryData<InboxData>(queryKey, (current) => ({
        threads: updater(current?.threads ?? []),
      }))
    },
  }
}
