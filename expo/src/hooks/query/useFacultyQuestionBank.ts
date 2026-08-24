import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { instructorApi, type InstructorBankQuestion } from "../../lib/instructor-api"
import type { InstructorScope } from "../../lib/instructor-content-api"
import { requestQueryUndo } from "../../components/query/QueryUndoHost"
import { fetchFacultyQuestionBankBundle } from "../../lib/query/prefetch"
import {
  beginOptimistic,
  facultyQueryScopeFromInstructor,
  invalidateByAction,
  queryKeys,
  removeById,
  rollbackIfCurrent,
  resourceVersionKey,
  STALE_BY_RESOURCE,
} from "../../lib/query"

type BankBundle = Awaited<ReturnType<typeof fetchFacultyQuestionBankBundle>>

function bankKey(scope: InstructorScope) {
  return queryKeys.faculty.questionBank.list(facultyQueryScopeFromInstructor(scope))
}

export function useFacultyQuestionBank(scope: InstructorScope | null) {
  const query = useQuery({
    queryKey: scope
      ? queryKeys.faculty.questionBank.list(facultyQueryScopeFromInstructor(scope))
      : ["faculty", "questionBank", "idle", "list"],
    queryFn: () => fetchFacultyQuestionBankBundle(scope!),
    enabled: Boolean(scope?.courseId),
    staleTime: STALE_BY_RESOURCE.facultyQuestionBank,
    placeholderData: (previous) => previous,
  })
  const hasData = query.data != null
  return {
    questions: query.data?.questions ?? [],
    topics: query.data?.topics ?? [],
    deleted: query.data?.deleted ?? [],
    customTypes: query.data?.customTypes ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}

export function useSoftDeleteFacultyQuestion(scope: InstructorScope | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["faculty", "questionBank", "softDelete"],
    mutationFn: async (question: InstructorBankQuestion) => {
      if (!scope) throw new Error("No course selected")
      await instructorApi.deleteQuestionBankQuestion(scope, question.id)
      return question
    },
    onMutate: async (question) => {
      if (!scope) return
      const queryKey = bankKey(scope)
      await queryClient.cancelQueries({ queryKey })
      const ctx = beginOptimistic<BankBundle>(
        queryClient,
        queryKey,
        resourceVersionKey("bankQ", question.id),
        (current) => ({
          questions: removeById(current?.questions ?? [], question.id),
          topics: current?.topics ?? [],
          deleted: [{ ...question, deleted_at: question.deleted_at ?? "deleted" }, ...(current?.deleted ?? [])],
          customTypes: current?.customTypes ?? [],
        }),
      )
      return { ...ctx, queryKey }
    },
    onError: (_err, question, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(queryClient, ctx.queryKey, resourceVersionKey("bankQ", question.id), ctx.version, ctx.previous)
    },
    onSuccess: (question) => {
      if (!scope) return
      invalidateByAction(queryClient, facultyQueryScopeFromInstructor(scope), "faculty.questionBank.mutate")
      requestQueryUndo({
        message: "Moved to trash",
        onUndo: () => instructorApi.restoreQuestionBankQuestions(scope, [question.id]).then(() => queryClient.invalidateQueries({ queryKey: bankKey(scope) })),
      })
    },
  })
}

export function useRestoreFacultyQuestion(scope: InstructorScope | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["faculty", "questionBank", "restore"],
    mutationFn: async (question: InstructorBankQuestion) => {
      if (!scope) throw new Error("No course selected")
      await instructorApi.restoreQuestionBankQuestions(scope, [question.id])
      return question
    },
    onMutate: async (question) => {
      if (!scope) return
      const queryKey = bankKey(scope)
      await queryClient.cancelQueries({ queryKey })
      const ctx = beginOptimistic<BankBundle>(
        queryClient,
        queryKey,
        resourceVersionKey("bankQ-restore", question.id),
        (current) => ({
          questions: [{ ...question, deleted_at: undefined }, ...(current?.questions ?? [])],
          topics: current?.topics ?? [],
          deleted: removeById(current?.deleted ?? [], question.id),
          customTypes: current?.customTypes ?? [],
        }),
      )
      return { ...ctx, queryKey }
    },
    onError: (_err, question, ctx) => {
      if (!ctx) return
      rollbackIfCurrent(
        queryClient,
        ctx.queryKey,
        resourceVersionKey("bankQ-restore", question.id),
        ctx.version,
        ctx.previous,
      )
    },
    onSuccess: () => {
      if (!scope) return
      invalidateByAction(queryClient, facultyQueryScopeFromInstructor(scope), "faculty.questionBank.mutate")
    },
  })
}

export function usePermanentDeleteFacultyQuestion(scope: InstructorScope | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["faculty", "questionBank", "permanentDelete"],
    mutationFn: async (question: InstructorBankQuestion) => {
      if (!scope) throw new Error("No course selected")
      await instructorApi.permanentlyDeleteQuestionBankQuestions(scope, [question.id])
      return question
    },
    onSuccess: (question) => {
      if (!scope) return
      const queryKey = bankKey(scope)
      queryClient.setQueryData<BankBundle>(queryKey, (current) => ({
        questions: removeById(current?.questions ?? [], question.id),
        topics: current?.topics ?? [],
        deleted: removeById(current?.deleted ?? [], question.id),
        customTypes: current?.customTypes ?? [],
      }))
      invalidateByAction(queryClient, facultyQueryScopeFromInstructor(scope), "faculty.questionBank.mutate")
    },
  })
}
