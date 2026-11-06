type StudentQueryCourse = {
  courseId: number | null
  section: string | null
}

type Listener = (course: StudentQueryCourse) => void

let activeCourse: StudentQueryCourse = { courseId: null, section: null }
const listeners = new Set<Listener>()

export function getStudentQueryCourse(): StudentQueryCourse {
  return activeCourse
}

export function setStudentQueryCourse(course: StudentQueryCourse | null): void {
  const next: StudentQueryCourse = {
    courseId:
      course?.courseId != null && Number.isFinite(course.courseId) && course.courseId > 0
        ? Math.trunc(course.courseId)
        : null,
    section: course?.section?.trim() || null,
  }
  if (activeCourse.courseId === next.courseId && activeCourse.section === next.section) return
  activeCourse = next
  listeners.forEach((listener) => listener(next))
}

export function subscribeStudentQueryCourse(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
