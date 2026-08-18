import type { LegalDocument } from "./types"

/** Native privacy policy — keep aligned with v0-coursecollabv3/app/privacy/page.tsx */
export const PRIVACY_POLICY = {
  title: "Privacy Policy",
  updated: "August 17, 2026",
  intro:
    "This policy describes the information CourseCollab processes in the web application, its APIs, and the native apps that call those APIs.",
  sections: [
    {
      title: "Who This Applies To",
      paragraphs: [
        "Students, teaching assistants, observers, faculty, administrators, and Career Member (guest) accounts.",
        "Institutional academic records may be retained after an account is closed because CourseCollab is used as a course of record.",
      ],
    },
    {
      title: "Information We Process",
      bullets: [
        "Name and profile details for account identification, rosters, and support.",
        "Email address for sign-in, password reset, course email, and receipts.",
        "Student and university identifiers, section, and course enrollment.",
        "Password hashes and optional MFA device trust for authentication.",
        "Assignments, submissions, grades, attendance, and quiz responses as course records.",
        "Uploaded files such as homework, projects, and profile photos.",
        "Cora conversations, prompts, and credit usage when you use AI features.",
        "Push notification tokens for class reminders and course alerts.",
        "Stripe customer and subscription references for memberships and Cora credits.",
        "Server diagnostics and error logs for reliability (not sold to advertisers).",
      ],
    },
    {
      title: "What We Do Not Collect",
      bullets: [
        "Precise location is not requested by the CourseCollab backend.",
        "Raw payment card numbers are not stored; Stripe handles card data.",
        "Advertising identifiers are not used for third-party ads.",
        "Health, fitness, browsing history, and contacts are not collected.",
      ],
    },
    {
      title: "Cora AI",
      paragraphs: [
        "When you use Cora, your prompt and the course context you are authorized to see may be sent to OpenAI and/or Anthropic to generate a response.",
        "Conversations can be stored so you can resume them. Instructor sharing of Cora summaries is off unless you enable it.",
        "See AI & Data in Settings for a focused summary of model processing.",
      ],
    },
    {
      title: "Payments",
      paragraphs: [
        "Memberships and Cora credit packs are processed by Stripe. CourseCollab stores customer and subscription references, not raw card numbers.",
      ],
    },
    {
      title: "Your Choices",
      paragraphs: [
        "Open Settings → Privacy & legal to review this policy, AI disclosures, and request account deletion.",
        "Deletion anonymizes personal profile fields and removes Cora conversations and push tokens.",
        "Grades, submissions, and payment records needed for institutional or financial obligations are retained.",
      ],
    },
    {
      title: "Contact",
      paragraphs: ["Privacy questions: support@course-collab.com"],
    },
  ],
}
