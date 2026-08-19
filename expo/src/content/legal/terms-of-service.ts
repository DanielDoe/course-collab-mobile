import type { LegalDocument } from "./types"

/** Native terms — keep aligned with v0-coursecollabv3/app/terms/page.tsx */
export const TERMS_OF_SERVICE = {
  title: "Terms of Service",
  updated: "August 18, 2026",
  intro:
    "These terms apply to CourseCollab websites, APIs, and mobile applications. They are available without purchasing a membership.",
  sections: [
    {
      title: "Accounts",
      paragraphs: [
        "You must use accurate information and keep your password confidential.",
        "Faculty, student, teaching assistant, observer, administrator, and Career Member roles have different permissions.",
        "Changing a role in the app does not grant that role — the server decides access.",
      ],
    },
    {
      title: "Coursework and Acceptable Use",
      paragraphs: [
        "You may not use CourseCollab to cheat on assessments, access another person's records, attack the service, or upload unlawful content.",
        "Instructors remain responsible for official grades and course materials.",
      ],
    },
    {
      title: "Cora",
      paragraphs: [
        "Cora is an AI assistant. Its output can be wrong and is not a substitute for instructor guidance, official course documents, or professional advice.",
        "See the AI & Data disclosure for how prompts and course context are processed.",
      ],
    },
    {
      title: "Paid Features",
      paragraphs: [
        "Some memberships and Cora credit packs are paid. Web purchases currently use Stripe.",
        "Native iOS purchases, if offered inside the iOS app, must follow Apple's then-current In-App Purchase rules.",
        "Entitlements are granted only after CourseCollab verifies the purchase server-side.",
      ],
    },
    {
      title: "Institutional Records",
      paragraphs: [
        "If you are enrolled in a course, your instructor and institution may retain academic records after you close your personal account.",
      ],
    },
    {
      title: "Contact",
      paragraphs: ["support@course-collab.com"],
    },
  ],
}
