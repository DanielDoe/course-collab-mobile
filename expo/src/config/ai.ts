/** Factual Cora AI processing disclosure — reflects mobile + API behavior, not legal policy text. */
export const AI_DATA_DISCLOSURE = {
  productName: "Cora",
  thirdPartyProcessing: true,
  thirdPartyDescription:
    "CourseCollab sends prompts and approved course context to third-party AI providers through CourseCollab servers. Provider model names are not shown in the app.",
  conversationStorage:
    "Cora conversations and usage logs may be stored on CourseCollab servers when you use Cora features. Cora usage history is available under Settings → Cora usage.",
  localPreferences:
    "Some Cora learning preferences are stored on this device and included in chat context when supported.",
  courseContext:
    "Cora only receives course materials and academic data your role is authorized to access. Authorization is enforced server-side before content reaches the model.",
  studentMembershipNote:
    "Some Cora tools require Explorer or Trailblazer membership. CodeBench requires Trailblazer.",
  accuracyNote:
    "Cora responses are AI-generated suggestions. Review important academic work with your instructor or official course materials.",
} as const

export function validateProductionAiConfig(): string[] {
  return []
}
