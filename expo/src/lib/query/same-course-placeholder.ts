/** Keep cached rows on refetch, but never show Course A data under a Course B key. */
export function keepSameCoursePlaceholder<T>(
  previous: T | undefined,
  previousQuery: { queryKey: readonly unknown[] } | undefined,
  nextKey: readonly unknown[],
): T | undefined {
  if (previous == null || !previousQuery) return undefined
  const prev = previousQuery.queryKey
  if (prev[0] !== nextKey[0] || prev[2] !== nextKey[2] || prev[3] !== nextKey[3] || prev[4] !== nextKey[4]) {
    return undefined
  }
  return previous
}
