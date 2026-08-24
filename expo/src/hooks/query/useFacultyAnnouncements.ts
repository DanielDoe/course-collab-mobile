import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { instructorApi, type InstructorAnnouncement } from "../../lib/instructor-api"
import type { InstructorScope } from "../../lib/instructor-api"
import {
  beginOptimistic,
  facultyQueryScopeFromInstructor,
  invalidateByAction,
  queryKeys,
  removeById,
  resourceVersionKey,
  rollbackIfCurrent,
  STALE_BY_RESOURCE,
  upsertById,
} from "../../lib/query"

type ListData = {
  announcements: InstructorAnnouncement[]
  sessions: Array<{ value: string; label: string }>
}

export function useFacultyAnnouncements(scope: InstructorScope | null) {
  const query = useQuery({
    queryKey: scope
      ? queryKeys.faculty.announcements.list(facultyQueryScopeFromInstructor(scope))
      : ["faculty", "announcements", "idle", "list"],
    queryFn: async (): Promise<ListData> => {
      const [items, sessionsRes] = await Promise.all([
        instructorApi.getAnnouncements(scope!),
        instructorApi.getSessions(scope!).catch(() => ({ sessions: [] })),
      ])
      const seen = new Set<string>()
      const sessions = (sessionsRes.sessions ?? [])
        .filter((session) => {
          if (!session.code || seen.has(session.code)) return false
          seen.add(session.code)
          return true
        })
        .map((session) => ({ value: session.code, label: session.code }))
      return { announcements: items, sessions }
    },
    enabled: Boolean(scope?.courseId),
    staleTime: STALE_BY_RESOURCE.facultyAnnouncements,
  })
  const hasData = query.data != null
  return {
    announcements: query.data?.announcements ?? [],
    sessions: query.data?.sessions ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}

export function useSaveFacultyAnnouncement(scope: InstructorScope | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["faculty", "announcements", "save"],
    mutationFn: async (input: {
      editingId?: number
      payload: Parameters<typeof instructorApi.createAnnouncement>[1]
    }) => {
      if (!scope) throw new Error("No course selected")
      if (input.editingId != null) {
        return instructorApi.updateAnnouncement(scope, input.editingId, input.payload)
      }
      return instructorApi.createAnnouncement(scope, input.payload)
    },
    onMutate: async (input) => {
      if (!scope || input.editingId == null) return
      const queryScope = facultyQueryScopeFromInstructor(scope)
      const listKey = queryKeys.faculty.announcements.list(queryScope)
      await queryClient.cancelQueries({ queryKey: listKey })
      const ctx = beginOptimistic<ListData>(
        queryClient,
        listKey,
        resourceVersionKey("facultyAnnouncement", input.editingId),
        (current) => ({
          announcements: (current?.announcements ?? []).map((item) =>
            item.id === input.editingId
              ? {
                  ...item,
                  title: input.payload.title,
                  content: input.payload.content,
                  pinned: input.payload.pinned,
                  type: input.payload.type,
                  priority: input.payload.priority,
                  target_session: input.payload.target_session,
                  expires_at: input.payload.expires_at,
                  attachments: input.payload.attachments,
                  updated_at: new Date().toISOString(),
                }
              : item,
          ),
          sessions: current?.sessions ?? [],
        }),
      )
      return { ...ctx, listKey, editingId: input.editingId }
    },
    onError: (_err, input, ctx) => {
      if (!ctx || input.editingId == null) return
      rollbackIfCurrent(
        queryClient,
        ctx.listKey,
        resourceVersionKey("facultyAnnouncement", input.editingId),
        ctx.version,
        ctx.previous,
      )
    },
    onSuccess: (announcement, input) => {
      if (!scope) return
      const queryScope = facultyQueryScopeFromInstructor(scope)
      const listKey = queryKeys.faculty.announcements.list(queryScope)
      queryClient.setQueryData<ListData>(listKey, (current) => ({
        announcements: upsertById(current?.announcements ?? [], announcement),
        sessions: current?.sessions ?? [],
      }))
      invalidateByAction(
        queryClient,
        queryScope,
        input.editingId != null ? "faculty.announcements.update" : "faculty.announcements.create",
        { announcementId: announcement.id },
      )
    },
  })
}

export function useDeleteFacultyAnnouncement(scope: InstructorScope | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["faculty", "announcements", "delete"],
    mutationFn: async (item: InstructorAnnouncement) => {
      if (!scope) throw new Error("No course selected")
      await instructorApi.deleteAnnouncement(scope, item.id)
      return item
    },
    onMutate: async (item) => {
      if (!scope) return
      const queryScope = facultyQueryScopeFromInstructor(scope)
      const listKey = queryKeys.faculty.announcements.list(queryScope)
      await queryClient.cancelQueries({ queryKey: listKey })
      const ctx = beginOptimistic<ListData>(
        queryClient,
        listKey,
        resourceVersionKey("facultyAnnouncement", item.id),
        (current) => ({
          announcements: removeById(current?.announcements ?? [], item.id),
          sessions: current?.sessions ?? [],
        }),
      )
      return { ...ctx, listKey }
    },
    onError: (_err, item, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(
        queryClient,
        ctx.listKey,
        resourceVersionKey("facultyAnnouncement", item.id),
        ctx.version,
        ctx.previous,
      )
    },
    onSuccess: (item) => {
      if (!scope) return
      invalidateByAction(queryClient, facultyQueryScopeFromInstructor(scope), "faculty.announcements.update", {
        announcementId: item.id,
      })
    },
  })
}
