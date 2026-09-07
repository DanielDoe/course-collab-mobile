/**
 * CourseCollab mobile query pattern (follow for every new module).
 *
 * 1. Keys: queryKeys.<portal>.<module>.<resource>(scope, id?)
 *    Scope always includes portal + userId + courseId + section.
 * 2. Classify every mutation in MUTATION_CATALOG before writing UI.
 *    OPTIMISTIC | PENDING | CONFIRMATION_REQUIRED
 * 3. Queries: useQuery with STALE_BY_RESOURCE, placeholderData from cache.
 *    First visit → skeleton. Return visit → cached data + background refetch.
 * 4. Mutations: useMutation onMutate/onError/onSuccess/onSettled.
 *    CREATE: temp id → POST → replaceTempWithAuthoritative (no duplicates).
 *    UPDATE: patch cache → PATCH → replace if mutation version is current.
 *    DELETE (safe): remove immediately → DELETE → rollback on failure.
 *    High-risk: pressed → pending label → wait for server → success copy.
 * 5. Success responses update the cache entity. Invalidate only INVALIDATION_GRAPH targets.
 * 6. Persist only canPersistQueryKey resources. Never persist admin/grades/exams/Cora secrets.
 * 7. Logout / account switch / role switch / course switch: clearUserQueryState.
 * 8. Cora confirm results call applyCoraMutationToCache — no manual refresh.
 * 9. Refresh UX: pull-to-refresh indicator; never replace cached screens with a spinner.
 * 10. Error UX: keep cached rows; show QueryRefreshBanner + Retry.
 */
export const QUERY_MODULE_PATTERN = {
  version: 1,
  phases: {
    1: ["student.notes", "student.flashcards", "student.announcements", "student.notifications"],
    2: [
      "faculty.announcements",
      "faculty.notes",
      "student.dashboard",
      "faculty.dashboard",
      "student.lectures",
      "faculty.questionBank",
      "faculty.quizzes",
    ],
    3: ["student.practice", "student.projects", "student.groups", "student.officeHours", "faculty.officeHours"],
    4: [
      "faculty.flashcards",
      "student.messages",
      "faculty.messages",
      "student.calendar",
      "faculty.calendar",
      "student.grades",
      "faculty.students",
    ],
    5: ["analytics", "results", "admin"],
    6: ["cora"],
  },
} as const
