import type { GuestCapability } from "../lib/guest-types"

export type GuestCoraQuickPrompt = {
  id: string
  label: string
  icon: "document-text-outline" | "briefcase-outline" | "chatbubbles-outline" | "school-outline" | "map-outline"
  prompt: string
  capability: GuestCapability
  creditFree?: boolean
}

export const GUEST_CORA_QUICK_PROMPTS: GuestCoraQuickPrompt[] = [
  {
    id: "brief",
    label: "Recommendation brief",
    icon: "document-text-outline",
    prompt:
      "Help me draft a recommendation letter brief for my instructor. Ask me about my achievements, goals, and context for this letter.",
    capability: "recommendations.brief",
    creditFree: true,
  },
  {
    id: "resume",
    label: "Review résumé",
    icon: "briefcase-outline",
    prompt: "Review my résumé and suggest improvements for graduate school and internship applications.",
    capability: "cora.career.resume",
  },
  {
    id: "interview",
    label: "Interview prep",
    icon: "chatbubbles-outline",
    prompt: "Help me prepare for a technical and behavioral interview. Start with common questions for my field.",
    capability: "cora.career.interview",
  },
  {
    id: "personal_statement",
    label: "Personal statement",
    icon: "school-outline",
    prompt: "Help me outline a compelling personal statement for graduate school applications.",
    capability: "cora.career.personal_statement",
  },
  {
    id: "application_plan",
    label: "Application plan",
    icon: "map-outline",
    prompt: "Create a step-by-step application plan with deadlines for scholarships and graduate programs.",
    capability: "cora.career.application_plan",
  },
]
