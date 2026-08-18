import type { LegalDocument } from "./types"

/** Full AI & Data disclosure — keep aligned with v0-coursecollabv3/app/ai-and-data/page.tsx */
export const AI_AND_DATA = {
  title: "AI & Data",
  updated: "August 17, 2026",
  intro:
    "Cora is CourseCollab's AI layer. This describes what the current implementation actually does.",
  sections: [
    {
      title: "What Cora Processes",
      bullets: [
        "Your message and recent conversation turns.",
        "Course context you are already authorized to see (released lectures, your grades, your calendar).",
        "Optional learning preferences and memory you enable.",
        "Uploaded files you attach to a Cora workflow, such as a résumé in Career tools.",
      ],
    },
    {
      title: "Who Runs the Models",
      paragraphs: [
        "Cora calls OpenAI and/or Anthropic using server-side API keys. Those keys are not shipped to the mobile or browser client.",
        "Provider retention follows that provider's terms.",
      ],
    },
    {
      title: "What Is Stored",
      paragraphs: [
        "Conversations and credit usage are stored so you can resume work and so CourseCollab can meter included and purchased credits.",
        "Instructor sharing of Cora summaries is off unless you turn it on in Cora preferences.",
      ],
    },
    {
      title: "What Cora Must Not Do",
      paragraphs: [
        "Cora inherits your signed-in role. A student assistant cannot retrieve unpublished exams, answer keys, another student's work, or admin tools.",
        "Tool permissions are enforced in application code before protected records are retrieved — not only by the system prompt.",
      ],
    },
    {
      title: "Accuracy",
      paragraphs: [
        "Cora output can contain errors. Treat it as study help, not as an official grade, answer key, or university record.",
      ],
    },
  ],
}
