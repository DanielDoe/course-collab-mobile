import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  dismissNotification,
  fetchStudentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type StudentNotification,
} from "../../lib/student-notifications"
import {
  beginOptimistic,
  queryKeys,
  removeById,
  rollbackIfCurrent,
  resourceVersionKey,
  STALE_BY_RESOURCE,
} from "../../lib/query"
import type { StudentAuthSession } from "../../lib/student-session-proof"
import { studentInboxScope } from "../../lib/query/scope"

type NotificationSession = StudentAuthSession & { courseId?: number }

type InboxData = {
  notifications: StudentNotification[]
  unreadCount: number
  throttled?: boolean
}

export function useStudentNotificationsInbox(session: NotificationSession | null, enabled = true) {
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.notifications.inbox(notificationScope(session))
      : ["student", "notifications", "idle", "inbox"],
    queryFn: () => fetchStudentNotifications(session!),
    enabled: Boolean(session) && enabled,
    staleTime: STALE_BY_RESOURCE.studentNotifications,
  })
  const hasData = query.data != null
  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    throttled: query.data?.throttled,
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    loadFailed: query.isError && !hasData,
    loadError: query.error instanceof Error ? query.error.message : query.isError ? "Could not load notifications." : null,
    refreshFailed: query.isError && hasData,
    refetch: query.refetch,
  }
}

export function useMarkNotificationRead(session: NotificationSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: number) => {
      if (!session) return false
      return markNotificationRead(session, notificationId)
    },
    onMutate: async (notificationId) => {
      if (!session) return
      const queryKey = queryKeys.student.notifications.inbox(notificationScope(session))
      const resourceKey = resourceVersionKey("notif", notificationId)
      const ctx = beginOptimistic<InboxData>(queryClient, queryKey, resourceKey, (current) => {
        const notifications = (current?.notifications ?? []).map((item) =>
          item.id === notificationId
            ? { ...item, is_read: true, read_at: new Date().toISOString() }
            : item,
        )
        return {
          notifications,
          unreadCount: notifications.filter((item) => !item.is_read).length,
        }
      })
      return { ...ctx, queryKey, resourceKey }
    },
    onError: (_err, _id, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.queryKey, ctx.resourceKey, ctx.version, ctx.previous)
    },
    onSuccess: (ok, _id, ctx) => {
      if (!ok && ctx) {
        rollbackIfCurrent(queryClient, ctx.queryKey, ctx.resourceKey, ctx.version, ctx.previous)
      }
    },
  })
}

export function useMarkAllNotificationsRead(session: NotificationSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!session) return false
      return markAllNotificationsRead(session)
    },
    onMutate: async () => {
      if (!session) return
      const queryKey = queryKeys.student.notifications.inbox(notificationScope(session))
      const resourceKey = resourceVersionKey("notif", "all")
      const ctx = beginOptimistic<InboxData>(queryClient, queryKey, resourceKey, (current) => ({
        notifications: (current?.notifications ?? []).map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
        unreadCount: 0,
      }))
      return { ...ctx, queryKey, resourceKey }
    },
    onError: (_err, _void, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.queryKey, ctx.resourceKey, ctx.version, ctx.previous)
    },
    onSuccess: (ok, _void, ctx) => {
      if (!ok && ctx) {
        rollbackIfCurrent(queryClient, ctx.queryKey, ctx.resourceKey, ctx.version, ctx.previous)
      }
    },
  })
}

export function useDismissNotification(session: NotificationSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: number) => {
      if (!session) return false
      return dismissNotification(session, notificationId)
    },
    onMutate: async (notificationId) => {
      if (!session) return
      const queryKey = queryKeys.student.notifications.inbox(notificationScope(session))
      const resourceKey = resourceVersionKey("notif-del", notificationId)
      const ctx = beginOptimistic<InboxData>(queryClient, queryKey, resourceKey, (current) => {
        const notifications = removeById(current?.notifications ?? [], notificationId)
        return {
          notifications,
          unreadCount: notifications.filter((item) => !item.is_read).length,
        }
      })
      return { ...ctx, queryKey, resourceKey }
    },
    onError: (_err, _id, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.queryKey, ctx.resourceKey, ctx.version, ctx.previous)
    },
    onSuccess: (ok, _id, ctx) => {
      if (!ok && ctx) {
        rollbackIfCurrent(queryClient, ctx.queryKey, ctx.resourceKey, ctx.version, ctx.previous)
      }
    },
  })
}

function notificationScope(session: NotificationSession) {
  return studentInboxScope({
    databaseId: session.databaseId,
    section: session.section,
    courseId: session.courseId,
  })
}
