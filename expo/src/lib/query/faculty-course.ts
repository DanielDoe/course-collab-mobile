type Listener = (courseId: number | null) => void

let activeCourseId: number | null = null
const listeners = new Set<Listener>()

export function getFacultyQueryCourseId(): number | null {
  return activeCourseId
}

export function setFacultyQueryCourseId(courseId: number | null): void {
  const next = courseId != null && Number.isFinite(courseId) && courseId > 0 ? Math.trunc(courseId) : null
  if (activeCourseId === next) return
  activeCourseId = next
  listeners.forEach((listener) => listener(next))
}

export function subscribeFacultyQueryCourse(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
