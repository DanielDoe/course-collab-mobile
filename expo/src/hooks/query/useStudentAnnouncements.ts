import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { courseInfoApi } from "../../lib/course-info-api"
import type { Announcement, AnnouncementComment } from "../../lib/student-api"
import {
  beginOptimistic,
  queryKeys,
  rollbackIfCurrent,
  resourceVersionKey,
  studentQueryScope,
  STALE_BY_RESOURCE,
} from "../../lib/query"
import type { StudentSession } from "../../lib/session"

type ListData = { announcements: Announcement[] }
type DetailData = { announcement: Announcement }
type CommentsData = { comments: AnnouncementComment[] }

export function useStudentAnnouncements(session: StudentSession | null) {
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.announcements.list(studentQueryScope(session))
      : ["student", "announcements", "idle", "list"],
    queryFn: () => courseInfoApi.getAnnouncements(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.studentAnnouncements,
  })
  const hasData = query.data != null
  return {
    announcements: query.data?.announcements ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}

export function useStudentAnnouncementDetail(session: StudentSession | null, announcementId: number) {
  const queryClient = useQueryClient()
  const scope = session ? studentQueryScope(session) : null
  const cached = (() => {
    if (!scope) return undefined
    const list = queryClient.getQueryData<ListData>(queryKeys.student.announcements.list(scope))
    return list?.announcements.find((item) => item.id === announcementId)
  })()

  const detail = useQuery({
    queryKey: scope
      ? queryKeys.student.announcements.detail(scope, announcementId)
      : ["student", "announcements", "idle", "detail", announcementId],
    queryFn: () => courseInfoApi.getAnnouncementById(session!, announcementId),
    enabled: Boolean(session && scope && Number.isFinite(announcementId)),
    staleTime: STALE_BY_RESOURCE.studentAnnouncementDetail,
    initialData: cached ? { announcement: cached } : undefined,
  })

  const comments = useQuery({
    queryKey: scope
      ? queryKeys.student.announcements.comments(scope, announcementId)
      : ["student", "announcements", "idle", "comments", announcementId],
    queryFn: () => courseInfoApi.getAnnouncementComments(session!, announcementId),
    enabled: Boolean(session && scope && Number.isFinite(announcementId)),
    staleTime: STALE_BY_RESOURCE.studentAnnouncementDetail,
  })

  return {
    announcement: detail.data?.announcement ?? null,
    comments: comments.data?.comments ?? [],
    isInitialLoading: !detail.data && detail.isLoading,
    isRefreshing: detail.isFetching || comments.isFetching,
    refreshFailed: detail.isError && Boolean(detail.data),
    error: !detail.data ? detail.error : null,
    refetch: async () => {
      await Promise.all([detail.refetch(), comments.refetch()])
    },
  }
}

export function useMarkAnnouncementViewed(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["student", "announcements", "view"],
    mutationFn: async (announcementId: number) => {
      if (!session) throw new Error("Not signed in")
      return courseInfoApi.markAnnouncementViewed(session, announcementId)
    },
    onMutate: async (announcementId) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const listKey = queryKeys.student.announcements.list(scope)
      const detailKey = queryKeys.student.announcements.detail(scope, announcementId)
      const resourceKey = resourceVersionKey("ann-view", announcementId)
      const listCtx = beginOptimistic<ListData>(queryClient, listKey, resourceKey, (current) => ({
        announcements: (current?.announcements ?? []).map((item) =>
          item.id === announcementId ? { ...item, is_read: true, viewed_by_me: true } : item,
        ),
      }))
      const prevDetail = queryClient.getQueryData<DetailData>(detailKey)
      if (prevDetail) {
        queryClient.setQueryData(detailKey, {
          announcement: { ...prevDetail.announcement, is_read: true, viewed_by_me: true },
        })
      }
      return { listCtx, prevDetail, listKey, detailKey, resourceKey }
    },
    onError: (_err, _id, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.listKey, ctx.resourceKey, ctx.listCtx.version, ctx.listCtx.previous)
      queryClient.setQueryData(ctx.detailKey, ctx.prevDetail)
    },
  })
}

export function useReactToAnnouncement(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["student", "announcements", "react"],
    mutationFn: async (input: { announcementId: number; reactionType: string }) => {
      if (!session) throw new Error("Not signed in")
      return courseInfoApi.reactToAnnouncement(session, input.announcementId, input.reactionType)
    },
    onMutate: async (input) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const detailKey = queryKeys.student.announcements.detail(scope, input.announcementId)
      const resourceKey = resourceVersionKey("ann-react", input.announcementId)
      const ctx = beginOptimistic<DetailData>(queryClient, detailKey, resourceKey, (current) => {
        if (!current) return current as unknown as DetailData
        return { announcement: { ...current.announcement, my_reaction: input.reactionType } }
      })
      return { ...ctx, detailKey, resourceKey }
    },
    onError: (_err, _input, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.detailKey, ctx.resourceKey, ctx.version, ctx.previous)
    },
    onSuccess: (data, input, ctx) => {
      if (!ctx?.previous) return
      queryClient.setQueryData(ctx.detailKey, {
        announcement: { ...ctx.previous.announcement, my_reaction: data.reactionType },
      })
    },
  })
}

export function usePostAnnouncementComment(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["student", "announcements", "comment"],
    mutationFn: async (input: { announcementId: number; content: string }) => {
      if (!session) throw new Error("Not signed in")
      return courseInfoApi.postAnnouncementComment(session, input.announcementId, input.content)
    },
    onSuccess: (data, input) => {
      if (!session || !data.comment) return
      const scope = studentQueryScope(session)
      const commentsKey = queryKeys.student.announcements.comments(scope, input.announcementId)
      queryClient.setQueryData<CommentsData>(commentsKey, (current) => ({
        comments: [...(current?.comments ?? []), data.comment],
      }))
    },
  })
}
