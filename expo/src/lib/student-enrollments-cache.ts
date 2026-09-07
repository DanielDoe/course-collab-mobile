import type { StudentEnrollment } from "./student-enrollment"

let stashed: StudentEnrollment[] | null = null

export function stashStudentEnrollments(enrollments: StudentEnrollment[]): void {
  stashed = enrollments
}

export function peekStashedStudentEnrollments(): StudentEnrollment[] | null {
  return stashed
}

export function consumeStashedStudentEnrollments(): StudentEnrollment[] | null {
  const value = stashed
  stashed = null
  return value
}

export function clearStashedStudentEnrollments(): void {
  stashed = null
}
