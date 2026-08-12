import type { RecommendationRequest, RecommendationMeta } from "./course-info-api"
import type { GuestSession, StudentSession } from "./session"
import {
  studentApi,
  type StudentRecommendationDetail,
  type StudentRecommendationPatchAction,
} from "./student-api"

function guestAsStudentSession(session: GuestSession): StudentSession {
  return {
    portal: "student",
    id: session.id,
    name: session.name,
    databaseId: session.databaseId,
    section: "GUEST",
    expiresAt: session.expiresAt,
  }
}

export const guestApi = {
  getRecommendations: async (session: GuestSession) => {
    const data = await studentApi.getRecommendations(guestAsStudentSession(session))
    return (data.requests ?? []) as RecommendationRequest[]
  },

  getRecommendationMeta: (session: GuestSession) =>
    studentApi.getRecommendationMeta(guestAsStudentSession(session)) as Promise<RecommendationMeta>,

  createRecommendation: (
    session: GuestSession,
    payload: {
      courseId: number
      instructorId: number
      purpose: string
      deadline?: string
      studentRequestDescription?: string
    },
  ) => studentApi.createRecommendation(guestAsStudentSession(session), payload),

  getRecommendationDetail: (session: GuestSession, requestId: number) =>
    studentApi.getRecommendationDetail(guestAsStudentSession(session), requestId),

  patchRecommendation: (
    session: GuestSession,
    requestId: number,
    action: StudentRecommendationPatchAction,
    body: Record<string, unknown> = {},
  ) => studentApi.patchRecommendation(guestAsStudentSession(session), requestId, action, body),

  getProfile: (session: GuestSession) => studentApi.getProfile(guestAsStudentSession(session)),

  updateProfile: (session: GuestSession, payload: { fullName: string; email: string }) =>
    studentApi.updateProfile(guestAsStudentSession(session), payload),

  changePassword: (session: GuestSession, currentPassword: string, newPassword: string) =>
    studentApi.changePassword(guestAsStudentSession(session), currentPassword, newPassword),
}

export type { StudentRecommendationDetail, StudentRecommendationPatchAction }
