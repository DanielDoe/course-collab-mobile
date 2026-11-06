import { PRODUCTION_API_BASE_URL } from "../../../config/api"

export type StudentSignupStep = "course" | "section" | "profile" | "verify"

export function studentSignupMarketingImage(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${PRODUCTION_API_BASE_URL}${normalized}`
}

/** Same Cora home capture the web wizard uses — stable hero across every step. */
export const STUDENT_SIGNUP_PHONE_SHOT = {
  uri: studentSignupMarketingImage("/images/landing/cora/assistant-home.png"),
  accessibilityLabel:
    "CourseCollab mobile home with lectures, quizzes, and Cora assistant suggestions",
} as const

export const STUDENT_SIGNUP_STEP_CAPTIONS: Record<StudentSignupStep, string> = {
  course: "Pick the class your instructor set up — you'll land in the right course from day one.",
  section: "Sections keep you with the right lecture group and instructor roster.",
  profile: "Use the name and ID from your syllabus so your instructor can confirm you're on the roster.",
  verify: "Verify your email, then your instructor approves — you'll sign in with your university credentials.",
}

export const EMAIL_INBOX_HINT =
  "If you do not see our email within a few minutes, check your spam or junk folder and mark CourseCollab as not spam."
