/** Factual Cora AI processing disclosure — reflects mobile + API behavior, not legal policy text. */
export const AI_DATA_DISCLOSURE = {
  productName: "Cora",
  thirdPartyProcessing: true,
  thirdPartyDescription:
    "CourseCollab may use third-party AI providers (such as OpenAI and Anthropic) to process Cora requests through CourseCollab servers. Provider model names are not shown in the app.",
  dataMinimization:
    "Cora is designed with data minimization in mind. When CourseCollab uses external AI providers, we send only the information reasonably necessary to perform that task — for example, a question, your response, and relevant instructional context — without attaching your name, email, student ID, or other unnecessary account identifiers.",
  identityNote:
    "CourseCollab does not intentionally provide an AI provider with your identity merely to personalize an AI response.",
  conversationStorage:
    "Cora conversations and usage logs may be stored on CourseCollab servers when you use Cora features. Cora usage history is available under Settings → Cora usage.",
  localPreferences:
    "Some Cora privacy and learning preferences are stored on this device. Server-stored conversations, grades, and course records remain on CourseCollab servers.",
  courseContext:
    "Cora only receives course materials and academic data your role is authorized to access. Authorization is enforced server-side before content reaches the model.",
  userControls:
    "Settings → Cora → Privacy & personalization: Personalized learning, Use learning context, Local learning memory, Clear Cora learning memory, and Share with instructor.",
  studentMembershipNote:
    "Some Cora tools require Explorer or Trailblazer membership. CodeBench requires Trailblazer.",
  accuracyNote:
    "Cora responses are AI-generated suggestions. Review important academic work with your instructor or official course materials.",
} as const

export function validateProductionAiConfig(): string[] {
  return []
}
