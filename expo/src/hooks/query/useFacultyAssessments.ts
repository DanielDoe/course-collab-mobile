import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { instructorApi, type InstructorQuiz } from "../../lib/instructor-api"
import type { InstructorScope } from "../../lib/instructor-content-api"
import { requestQueryUndo } from "../../components/query/QueryUndoHost"
import { fetchFacultyAssessmentsBundle } from "../../lib/query/prefetch"
import {
  beginOptimistic,
  facultyQueryScopeFromInstructor,
  queryKeys,
  removeById,
  rollbackIfCurrent,
  resourceVersionKey,
  STALE_BY_RESOURCE,
} from "../../lib/query"

type AssessmentsBundle = Awaited<ReturnType<typeof fetchFacultyAssessmentsBundle>>

function assessmentsKey(scope: InstructorScope, assessmentType: string) {
  return queryKeys.faculty.quizzes.list(facultyQueryScopeFromInstructor(scope), assessmentType)
}

export function useFacultyAssessments(scope: InstructorScope | null, assessmentType: string) {
  const query = useQuery({
    queryKey: scope
      ? queryKeys.faculty.quizzes.list(facultyQueryScopeFromInstructor(scope), assessmentType)
      : ["faculty", "quizzes", "idle", "list", assessmentType],
    queryFn: () => fetchFacultyAssessmentsBundle(scope!, assessmentType),
    enabled: Boolean(scope?.courseId),
    staleTime: STALE_BY_RESOURCE.facultyAssessments,
    placeholderData: (previous) => previous,
  })
  const hasData = query.data != null
  return {
    quizzes: query.data?.quizzes ?? [],
    sessions: query.data?.sessions ?? [],
    openIssueCount: query.data?.openIssueCount ?? 0,
    deletedCount: query.data?.deletedCount ?? 0,
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}

export function useToggleFacultyAssessmentSession(scope: InstructorScope | null, assessmentType: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["faculty", "quizzes", "toggleSession"],
    mutationFn: async (input: { quizId: number; sessionCode: string; next: boolean }) => {
      if (!scope) throw new Error("No course selected")
      await instructorApi.toggleQuizSession(scope, input.quizId, input.sessionCode, input.next)
      return input
    },
    onMutate: async (input) => {
      if (!scope) return
      const queryKey = assessmentsKey(scope, assessmentType)
      await queryClient.cancelQueries({ queryKey })
      const ctx = beginOptimistic<AssessmentsBundle>(
        queryClient,
        queryKey,
        resourceVersionKey("quiz-session", `${input.quizId}:${input.sessionCode}`),
        (current) => ({
          quizzes: (current?.quizzes ?? []).map((quiz) =>
            quiz.id === input.quizId
              ? {
                  ...quiz,
                  session_access: { ...(quiz.session_access ?? {}), [input.sessionCode]: input.next },
                }
              : quiz,
          ),
          sessions: current?.sessions ?? [],
          openIssueCount: current?.openIssueCount ?? 0,
          deletedCount: current?.deletedCount ?? 0,
        }),
      )
      return { ...ctx, queryKey }
    },
    onError: (_err, input, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(
        queryClient,
        ctx.queryKey,
        resourceVersionKey("quiz-session", `${input.quizId}:${input.sessionCode}`),
        ctx.version,
        ctx.previous,
      )
    },
  })
}

export function useDeleteFacultyAssessment(scope: InstructorScope | null, assessmentType: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["faculty", "quizzes", "delete"],
    mutationFn: async (quiz: InstructorQuiz) => {
      if (!scope) throw new Error("No course selected")
      await instructorApi.deleteQuiz(scope, quiz.id)
      return quiz
    },
    onMutate: async (quiz) => {
      if (!scope) return
      const queryKey = assessmentsKey(scope, assessmentType)
      await queryClient.cancelQueries({ queryKey })
      const ctx = beginOptimistic<AssessmentsBundle>(
        queryClient,
        queryKey,
        resourceVersionKey("quiz-del", quiz.id),
        (current) => ({
          quizzes: removeById(current?.quizzes ?? [], quiz.id),
          sessions: current?.sessions ?? [],
          openIssueCount: current?.openIssueCount ?? 0,
          deletedCount: (current?.deletedCount ?? 0) + 1,
        }),
      )
      return { ...ctx, queryKey }
    },
    onError: (_err, quiz, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.queryKey, resourceVersionKey("quiz-del", quiz.id), ctx.version, ctx.previous)
    },
    onSuccess: (quiz) => {
      if (!scope) return
      requestQueryUndo({
        message: "Assessment deleted",
        onUndo: () =>
          instructorApi.restoreDeletedAssessment(scope, quiz.id).then(() =>
            queryClient.invalidateQueries({ queryKey: assessmentsKey(scope, assessmentType) }),
          ),
      })
    },
  })
}
