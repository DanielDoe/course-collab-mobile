import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { courseInfoApi } from "../../lib/course-info-api"
import { invalidateByAction, queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import type { StudentSession } from "../../lib/session"

export function useStudentOfficeHours(session: StudentSession | null) {
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.officeHours.list(studentQueryScope(session))
      : ["student", "officeHours", "idle", "list"],
    queryFn: () => courseInfoApi.getOfficeHours(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.officeHours,
    placeholderData: (previous) => previous,
  })
  const hasData = query.data != null
  return {
    requests: query.data?.requests ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}

export function useCreateStudentOfficeHours(session: StudentSession | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["student", "officeHours", "create"],
    mutationFn: async (payload: {
      topic: string
      areaOfConcern?: string
      description?: string
      priority?: string
      preferredDates?: string[]
    }) => {
      if (!session) throw new Error("Not signed in")
      return courseInfoApi.createOfficeHours(session, payload)
    },
    onSuccess: async () => {
      if (!session) return
      const scope = studentQueryScope(session)
      invalidateByAction(queryClient, scope, "student.officeHours.create")
      await queryClient.invalidateQueries({ queryKey: queryKeys.student.officeHours.list(scope) })
    },
  })
}
