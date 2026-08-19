import type { LegalDocument } from "./types"

/** Full AI & Data disclosure — keep aligned with v0-coursecollabv3/lib/compliance/legal-content.ts */
export const AI_AND_DATA = {
  title: "AI & Data",
  updated: "August 18, 2026",
  intro:
    "Cora is CourseCollab's AI layer. This describes what the current implementation does — including data minimization before external model calls.",
  sections: [
    {
      title: "What Cora Processes",
      bullets: [
        "Your message and recent conversation turns.",
        "Task-specific course context you are authorized to see (for example a question, your answer, and rubric text for feedback).",
        "Optional server-synced personalization toggles (Personalized learning, Use learning context) from Settings → Cora → Privacy & personalization.",
        "Device-local teaching memory toggles stored in your browser or app storage — not the same as chat history on CourseCollab servers.",
        "Uploaded files you attach to a disclosed workflow, such as a résumé in Career tools or audio for AI Notetaker transcription.",
      ],
    },
    {
      title: "Data Minimization",
      paragraphs: [
        "Before an external AI call, CourseCollab selects authorized data, removes or redacts common identifiers (names, emails, student IDs, internal database IDs, tokens, and unrelated profile fields), and sends a minimized payload.",
        "Cora tools may read authorized records internally to perform a task, but tool authorization is separate from model context — retrieved roster or account details are not automatically forwarded to the model.",
        "We do not serialize entire Student, Faculty, Course, or User database objects into prompts.",
      ],
    },
    {
      title: "Who Runs the Models",
      paragraphs: [
        "Cora calls third-party AI providers — currently OpenAI and/or Anthropic — using server-side API keys. These are commercial model APIs, not self-hosted open-source platforms unless we explicitly say otherwise for a specific feature.",
        "Provider retention and subprocessors follow each provider's published terms. CourseCollab remains the authoritative store for profiles, grades, enrollment, permissions, and academic records — not the AI provider.",
      ],
    },
    {
      title: "What Is Stored",
      paragraphs: [
        "Conversations, credit usage, and server-synced Cora privacy preferences are stored in CourseCollab Postgres.",
        "Teaching-style Cora memory toggles and cleared-memory choices are stored locally on your device.",
        "Instructor sharing of Cora summaries is off unless you turn it on in Cora preferences.",
      ],
    },
    {
      title: "Your Controls",
      bullets: [
        "Settings → Privacy & legal → Cora privacy & data use: Personalized learning/context (students), teaching context (faculty), or institutional context (admin).",
        "Local Cora memory toggles and Clear Cora learning memory (device-only).",
        "Students only: Share Cora summaries with instructor (off by default).",
        "How Cora uses your data: full AI & Data disclosure.",
        "Delete account from Settings → Privacy & legal to remove Cora conversations tied to your profile (subject to institutional record retention).",
      ],
    },
    {
      title: "AI Notetaker",
      paragraphs: [
        "AI Notetaker sends your question and the lecture transcript (or caption text) needed to answer it. Account identifiers are not added to the prompt for personalization alone.",
        "Transcripts and notes are stored in CourseCollab; processing may use the same third-party AI providers as Cora.",
      ],
    },
    {
      title: "Faculty and Admin Cora",
      paragraphs: [
        "Faculty and administrator Cora assistants follow the same minimization approach: aggregated or pseudonymized context when identity is unnecessary, and no bulk roster of student names or emails in external model payloads.",
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
