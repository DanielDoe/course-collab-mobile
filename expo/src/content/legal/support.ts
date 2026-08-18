import type { LegalDocument } from "./types"

/** Native support disclosure — keep aligned with v0-coursecollabv3/app/support/page.tsx */
export const SUPPORT_INFO = {
  title: "Support",
  updated: "August 17, 2026",
  intro:
    "CourseCollab support is available for policy questions without signing in, and for in-app help when you are signed in.",
  sections: [
    {
      title: "Get Help",
      bullets: [
        "Students: open Help Center from Settings after signing in.",
        "Faculty: open Help Center from the instructor dashboard or Settings.",
        "Career Members: use Help Center from guest Settings.",
      ],
    },
    {
      title: "Submit a Ticket",
      paragraphs: [
        "Signed-in users can submit support tickets, report bugs, and request features from Help Center in the app.",
      ],
    },
    {
      title: "Account and Privacy",
      paragraphs: [
        "Privacy Policy, Terms of Service, and AI & Data are available under Settings → Privacy & legal.",
        "Account deletion is available from the same screen when you are signed in.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [
        "Email support@course-collab.com for App Store review or institutional onboarding questions.",
      ],
    },
  ],
}
