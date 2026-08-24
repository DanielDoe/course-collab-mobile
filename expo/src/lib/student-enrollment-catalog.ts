import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"

export type EnrollmentCatalogSection = {
  id: number
  code: string
  description: string | null
}

export type EnrollmentCatalogCourse = {
  id: number
  courseCode: string
  courseTitle: string
  instructorName: string | null
  sections: EnrollmentCatalogSection[]
}

export async function fetchStudentEnrollmentCatalog(universityId: number): Promise<{
  activeTerm: { id: number; label: string } | null
  courses: EnrollmentCatalogCourse[]
}> {
  const response = await fetch(
    `${API_BASE_URL}/api/student/enrollment-catalog?universityId=${encodeURIComponent(String(universityId))}`,
    {
      headers: { Accept: "application/json" },
    },
  )
  const body = (await response.json()) as {
    error?: string
    activeTerm?: { id: number; label: string } | null
    courses?: EnrollmentCatalogCourse[]
  }
  if (!response.ok) {
    throw new ApiError(body.error ?? "Failed to load courses.", response.status, body)
  }
  return {
    activeTerm: body.activeTerm ?? null,
    courses: body.courses ?? [],
  }
}
