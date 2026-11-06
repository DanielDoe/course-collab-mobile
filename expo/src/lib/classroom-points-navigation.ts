export function classroomPointsAssignmentNavTarget(
  assignmentId: number | string | null | undefined,
): { kind: "detail"; assignmentId: number } | { kind: "list" } {
  const id = typeof assignmentId === "string" ? Number.parseInt(assignmentId, 10) : assignmentId
  if (id == null || !Number.isFinite(id) || id <= 0) return { kind: "list" }
  return { kind: "detail", assignmentId: id }
}
