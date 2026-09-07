import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CourseDigitalNote } from "../../lib/digital-notes-api"
import { instructorCourseNotesApi, type InstructorScope } from "../../lib/instructor-content-api"
import { fetchFacultyNotesBundle } from "../../lib/query/prefetch"
import {
  beginOptimistic,
  commitIfCurrent,
  facultyQueryScopeFromInstructor,
  invalidateByAction,
  queryKeys,
  removeById,
  replaceById,
  replaceTempWithAuthoritative,
  resourceVersionKey,
  rollbackIfCurrent,
  STALE_BY_RESOURCE,
} from "../../lib/query"
import { keepSameCoursePlaceholder } from "../../lib/query/same-course-placeholder"

type NotesBundle = Awaited<ReturnType<typeof fetchFacultyNotesBundle>>

export function useFacultyCourseNotes(scope: InstructorScope | null, topicSession: string) {
  const queryKey = scope
    ? queryKeys.faculty.notes.bundle(facultyQueryScopeFromInstructor(scope), topicSession)
    : (["faculty", "notes", "idle", "bundle", topicSession] as const)
  const query = useQuery({
    queryKey,
    queryFn: () => fetchFacultyNotesBundle(scope!, topicSession),
    enabled: Boolean(scope?.courseId),
    staleTime: STALE_BY_RESOURCE.facultyCourseNotes,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
  })
  const hasData = query.data != null
  return {
    notes: query.data?.notes ?? [],
    deletedNotes: query.data?.deletedNotes ?? [],
    topics: query.data?.topics ?? [],
    config: query.data?.config ?? null,
    sessions: query.data?.sessions ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}

function notesBundleKey(scope: InstructorScope, topicSession: string) {
  return queryKeys.faculty.notes.bundle(facultyQueryScopeFromInstructor(scope), topicSession)
}

export function useSaveFacultyCourseNote(scope: InstructorScope | null, topicSession: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["faculty", "notes", "save"],
    mutationFn: async (input: {
      tempId?: number
      editingId?: number
      payload: Parameters<typeof instructorCourseNotesApi.createNote>[1]
    }) => {
      if (!scope) throw new Error("No course selected")
      if (input.editingId != null) {
        return instructorCourseNotesApi.updateNote(scope, input.editingId, input.payload)
      }
      return instructorCourseNotesApi.createNote(scope, input.payload)
    },
    onMutate: async (input) => {
      if (!scope) return
      const queryKey = notesBundleKey(scope, topicSession)
      await queryClient.cancelQueries({ queryKey })
      const now = new Date().toISOString()
      if (input.editingId != null) {
        const ctx = beginOptimistic<NotesBundle>(
          queryClient,
          queryKey,
          resourceVersionKey("facultyNote", input.editingId),
          (current) => {
            const existing = current?.notes.find((note) => note.id === input.editingId)
            if (!existing) {
              return {
                notes: current?.notes ?? [],
                deletedNotes: current?.deletedNotes ?? [],
                topics: current?.topics ?? [],
                config: current?.config ?? null,
                sessions: current?.sessions ?? [],
              }
            }
            return {
              notes: replaceById(current?.notes ?? [], input.editingId, {
                ...existing,
                ...input.payload,
                id: input.editingId,
                updatedAt: now,
                optimistic: true,
              }),
              deletedNotes: current?.deletedNotes ?? [],
              topics: current?.topics ?? [],
              config: current?.config ?? null,
              sessions: current?.sessions ?? [],
            }
          },
        )
        return { ...ctx, queryKey, kind: "update" as const, id: input.editingId }
      }
      const tempId = input.tempId
      if (tempId == null) return
      const optimistic: CourseDigitalNote = {
        id: tempId,
        courseId: scope.courseId ?? 0,
        instructorId: scope.instructorId,
        topic: input.payload.topic ?? null,
        title: input.payload.title ?? "Untitled note",
        bodyText: input.payload.bodyText ?? "",
        inkWorkspace: input.payload.inkWorkspace ?? null,
        session: input.payload.session ?? null,
        isPublished: input.payload.isPublished ?? false,
        createdAt: now,
        updatedAt: now,
        optimistic: true,
      }
      const ctx = beginOptimistic<NotesBundle>(
        queryClient,
        queryKey,
        resourceVersionKey("facultyNote", tempId),
        (current) => ({
          notes: [optimistic, ...(current?.notes ?? [])],
          deletedNotes: current?.deletedNotes ?? [],
          topics: current?.topics ?? [],
          config: current?.config ?? null,
          sessions: current?.sessions ?? [],
        }),
      )
      return { ...ctx, queryKey, kind: "create" as const, id: tempId }
    },
    onError: (_err, input, ctx) => {
      if (!ctx || !scope) return
      rollbackIfCurrent(
        queryClient,
        ctx.queryKey,
        resourceVersionKey("facultyNote", ctx.id),
        ctx.version,
        ctx.previous,
      )
    },
    onSuccess: (data, input, ctx) => {
      if (!scope || !data.note) return
      const queryScope = facultyQueryScopeFromInstructor(scope)
      const queryKey = notesBundleKey(scope, topicSession)
      if (ctx && input.editingId != null) {
        const next: NotesBundle = {
          notes: replaceById(ctx.previous?.notes ?? [], input.editingId, { ...data.note, optimistic: false }),
          deletedNotes: ctx.previous?.deletedNotes ?? [],
          topics: ctx.previous?.topics ?? [],
          config: ctx.previous?.config ?? null,
          sessions: ctx.previous?.sessions ?? [],
        }
        commitIfCurrent(queryClient, queryKey, resourceVersionKey("facultyNote", input.editingId), ctx.version, next)
      } else if (ctx && input.tempId != null) {
        const next: NotesBundle = {
          notes: replaceTempWithAuthoritative(ctx.previous?.notes ?? [], input.tempId, {
            ...data.note,
            optimistic: false,
          }),
          deletedNotes: ctx.previous?.deletedNotes ?? [],
          topics: ctx.previous?.topics ?? [],
          config: ctx.previous?.config ?? null,
          sessions: ctx.previous?.sessions ?? [],
        }
        commitIfCurrent(queryClient, queryKey, resourceVersionKey("facultyNote", input.tempId), ctx.version, next)
      } else {
        queryClient.setQueryData<NotesBundle>(queryKey, (current) => ({
          notes: current
            ? replaceById(current.notes, data.note.id, { ...data.note, optimistic: false })
            : [{ ...data.note, optimistic: false }],
          deletedNotes: current?.deletedNotes ?? [],
          topics: current?.topics ?? [],
          config: current?.config ?? null,
          sessions: current?.sessions ?? [],
        }))
      }
      invalidateByAction(queryClient, queryScope, "faculty.notes.mutate", { noteId: data.note.id })
    },
  })
}

export function useDeleteFacultyCourseNote(scope: InstructorScope | null, topicSession: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["faculty", "notes", "delete"],
    mutationFn: async (note: CourseDigitalNote) => {
      if (!scope) throw new Error("No course selected")
      await instructorCourseNotesApi.deleteNote(scope, note.id)
      return note
    },
    onMutate: async (note) => {
      if (!scope) return
      const queryKey = notesBundleKey(scope, topicSession)
      await queryClient.cancelQueries({ queryKey })
      const ctx = beginOptimistic<NotesBundle>(
        queryClient,
        queryKey,
        resourceVersionKey("facultyNote", note.id),
        (current) => ({
          notes: removeById(current?.notes ?? [], note.id),
          deletedNotes: [{ ...note, optimistic: true }, ...(current?.deletedNotes ?? [])],
          topics: current?.topics ?? [],
          config: current?.config ?? null,
          sessions: current?.sessions ?? [],
        }),
      )
      return { ...ctx, queryKey }
    },
    onError: (_err, note, ctx) => {
      if (!ctx || !scope) return
      rollbackIfCurrent(
        queryClient,
        ctx.queryKey,
        resourceVersionKey("facultyNote", note.id),
        ctx.version,
        ctx.previous,
      )
    },
    onSuccess: (note) => {
      if (!scope) return
      invalidateByAction(queryClient, facultyQueryScopeFromInstructor(scope), "faculty.notes.mutate", {
        noteId: note.id,
      })
    },
  })
}
