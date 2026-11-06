import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  digitalNotesApi,
  type CourseDigitalNote,
  type StudentDigitalNote,
} from "../../lib/digital-notes-api"
import {
  beginOptimistic,
  commitIfCurrent,
  queryKeys,
  removeById,
  replaceTempWithAuthoritative,
  resourceVersionKey,
  rollbackIfCurrent,
  studentQueryScope,
  STALE_BY_RESOURCE,
  upsertById,
  createTempNumericId,
} from "../../lib/query"
import type { StudentSession } from "../../lib/session"
import { requestQueryUndo } from "../../components/query/QueryUndoHost"

type MineData = { notes: StudentDigitalNote[] }
type CourseData = { notes: CourseDigitalNote[]; courseId: number | null; session: string | null }

function emptyMine(): MineData {
  return { notes: [] }
}

export function useStudentNotesList(session: StudentSession | null) {
  const scope = session ? studentQueryScope(session) : null
  const mine = useQuery({
    queryKey: scope ? queryKeys.student.notes.mine(scope) : ["student", "notes", "idle", "mine"],
    queryFn: () => digitalNotesApi.listMyNotes(session!),
    enabled: Boolean(session && scope),
    staleTime: STALE_BY_RESOURCE.studentNotes,
  })
  const course = useQuery({
    queryKey: scope ? queryKeys.student.notes.course(scope) : ["student", "notes", "idle", "course"],
    queryFn: () => digitalNotesApi.listCourseNotes(session!),
    enabled: Boolean(session && scope),
    staleTime: STALE_BY_RESOURCE.studentCourseNotes,
  })

  const myNotes = mine.data?.notes ?? []
  const courseNotes = course.data?.notes ?? []
  const hasData = mine.data != null || course.data != null

  return {
    myNotes,
    courseNotes,
    isInitialLoading: !hasData && (mine.isLoading || course.isLoading),
    isRefreshing: mine.isFetching || course.isFetching,
    refreshFailed: (mine.isError || course.isError) && hasData,
    error: !hasData ? (mine.error ?? course.error) : null,
    refetch: async () => {
      await Promise.all([mine.refetch(), course.refetch()])
    },
  }
}

export function useStudentNoteDetail(session: StudentSession | null, noteId: number) {
  const queryClient = useQueryClient()
  const scope = session ? studentQueryScope(session) : null
  const cachedFromList = (() => {
    if (!scope) return undefined
    const mine = queryClient.getQueryData<MineData>(queryKeys.student.notes.mine(scope))
    return mine?.notes.find((note) => note.id === noteId)
  })()

  return useQuery({
    queryKey: scope
      ? queryKeys.student.notes.detail(scope, noteId)
      : ["student", "notes", "idle", "detail", noteId],
    queryFn: () => digitalNotesApi.getNote(session!, noteId),
    enabled: Boolean(session && scope && Number.isFinite(noteId) && noteId > 0),
    staleTime: STALE_BY_RESOURCE.studentNotes,
    initialData: cachedFromList ? { note: cachedFromList } : undefined,
    initialDataUpdatedAt: cachedFromList ? Date.now() : undefined,
  })
}

export function useCreateStudentNote(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["student", "notes", "create"],
    mutationFn: async (input: {
      tempId: number
      title?: string
      bodyText?: string
    }) => {
      if (!session) throw new Error("Not signed in")
      return digitalNotesApi.createNote(session, {
        title: input.title ?? "Untitled note",
        bodyText: input.bodyText ?? "",
      })
    },
    onMutate: async (input) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const queryKey = queryKeys.student.notes.mine(scope)
      await queryClient.cancelQueries({ queryKey })
      const now = new Date().toISOString()
      const optimistic: StudentDigitalNote = {
        id: input.tempId,
        title: input.title ?? "Untitled note",
        bodyText: input.bodyText ?? "",
        inkWorkspace: null,
        createdAt: now,
        updatedAt: now,
        isOwner: true,
        optimistic: true,
      }
      const ctx = beginOptimistic<MineData>(queryClient, queryKey, resourceVersionKey("note", input.tempId), (current) => ({
        notes: [optimistic, ...(current?.notes ?? [])],
      }))
      queryClient.setQueryData(queryKeys.student.notes.detail(scope, input.tempId), { note: optimistic })
      return { ...ctx, queryKey, scope }
    },
    onError: (_err, input, ctx) => {
      if (!ctx || !session) return
      rollbackIfCurrent(queryClient, ctx.queryKey, resourceVersionKey("note", input.tempId), ctx.version, ctx.previous)
      queryClient.removeQueries({ queryKey: queryKeys.student.notes.detail(ctx.scope, input.tempId) })
    },
    onSuccess: (data, input, ctx) => {
      if (!session || !ctx || !data.note) return
      const scope = ctx.scope
      const next = {
        notes: replaceTempWithAuthoritative(ctx.previous?.notes ?? [], input.tempId, {
          ...data.note,
          optimistic: false,
        }),
      }
      commitIfCurrent(queryClient, ctx.queryKey, resourceVersionKey("note", input.tempId), ctx.version, next)
      queryClient.removeQueries({ queryKey: queryKeys.student.notes.detail(scope, input.tempId) })
      queryClient.setQueryData(queryKeys.student.notes.detail(scope, data.note.id), { note: data.note })
    },
  })
}

export function useUpdateStudentNote(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["student", "notes", "update"],
    mutationFn: async (input: {
      noteId: number
      title?: string
      bodyText?: string
      inkWorkspace?: unknown
    }) => {
      if (!session) throw new Error("Not signed in")
      return digitalNotesApi.updateNote(session, input.noteId, input)
    },
    onMutate: async (input) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const listKey = queryKeys.student.notes.mine(scope)
      const detailKey = queryKeys.student.notes.detail(scope, input.noteId)
      await queryClient.cancelQueries({ queryKey: listKey })
      const resourceKey = resourceVersionKey("note", input.noteId)
      const listCtx = beginOptimistic<MineData>(queryClient, listKey, resourceKey, (current) => ({
        notes: (current?.notes ?? []).map((note) =>
          note.id === input.noteId
            ? {
                ...note,
                title: input.title ?? note.title,
                bodyText: input.bodyText ?? note.bodyText,
                inkWorkspace: input.inkWorkspace ?? note.inkWorkspace,
                updatedAt: new Date().toISOString(),
                optimistic: true,
              }
            : note,
        ),
      }))
      const prevDetail = queryClient.getQueryData<{ note: StudentDigitalNote }>(detailKey)
      if (prevDetail?.note) {
        queryClient.setQueryData(detailKey, {
          note: {
            ...prevDetail.note,
            title: input.title ?? prevDetail.note.title,
            bodyText: input.bodyText ?? prevDetail.note.bodyText,
            inkWorkspace: input.inkWorkspace ?? prevDetail.note.inkWorkspace,
            optimistic: true,
          },
        })
      }
      return { listCtx, prevDetail, listKey, detailKey, resourceKey, scope }
    },
    onError: (_err, _input, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.listKey, ctx.resourceKey, ctx.listCtx.version, ctx.listCtx.previous)
      queryClient.setQueryData(ctx.detailKey, ctx.prevDetail)
    },
    onSuccess: (data, input, ctx) => {
      if (!ctx || !data.note) return
      if (!commitIfCurrent(queryClient, ctx.listKey, ctx.resourceKey, ctx.listCtx.version, {
        notes: upsertById(ctx.listCtx.previous?.notes ?? [], data.note),
      })) {
        return
      }
      queryClient.setQueryData(ctx.detailKey, { note: data.note })
    },
  })
}

export function useDeleteStudentNote(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["student", "notes", "delete"],
    mutationFn: async (noteId: number) => {
      if (!session) throw new Error("Not signed in")
      if (noteId < 0) return { success: true }
      return digitalNotesApi.deleteNote(session, noteId)
    },
    onMutate: async (noteId) => {
      if (!session) return
      const scope = studentQueryScope(session)
      const listKey = queryKeys.student.notes.mine(scope)
      await queryClient.cancelQueries({ queryKey: listKey })
      const resourceKey = resourceVersionKey("note-del", noteId)
      const ctx = beginOptimistic<MineData>(queryClient, listKey, resourceKey, (current) => ({
        notes: removeById(current?.notes ?? [], noteId),
      }))
      queryClient.removeQueries({ queryKey: queryKeys.student.notes.detail(scope, noteId) })
      return { ...ctx, listKey, resourceKey, scope, noteId }
    },
    onError: (_err, noteId, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.listKey, ctx.resourceKey, ctx.version, ctx.previous)
    },
    onSuccess: (_data, noteId, ctx) => {
      if (!session || !ctx?.previous || noteId < 0) return
      const snapshot = ctx.previous.notes.find((note) => note.id === noteId)
      if (!snapshot) return
      requestQueryUndo({
        message: "Note deleted",
        onUndo: async () => {
          const restored = await digitalNotesApi.createNote(session, {
            title: snapshot.title,
            bodyText: snapshot.bodyText,
            inkWorkspace: snapshot.inkWorkspace ?? undefined,
          })
          if (!restored.note) return
          queryClient.setQueryData<MineData>(ctx.listKey, (current) => ({
            notes: upsertById(current?.notes ?? [], restored.note),
          }))
        },
      })
    },
  })
}

export function prepareTempNoteId(): number {
  return createTempNumericId()
}

export function findCachedCourseNote(session: StudentSession, noteId: number): CourseDigitalNote | null {
  const { getQueryClient } = require("../../lib/query/client") as typeof import("../../lib/query/client")
  const client = getQueryClient()
  const scope = studentQueryScope(session)
  const course = client.getQueryData<CourseData>(queryKeys.student.notes.course(scope))
  return course?.notes.find((note) => note.id === noteId) ?? null
}
