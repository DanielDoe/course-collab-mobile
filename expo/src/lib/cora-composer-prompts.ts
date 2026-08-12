import type { CoraComposerActionId } from "./cora-composer-actions"

export function buildConceptPrompt(concept: string): string {
  return `Explain the concept of "${concept}" clearly and comprehensively.`
}

export function buildMicroLessonPrompt(payload: {
  topic: string
  difficulty: string
  includeExamples: boolean
  autoQuiz: boolean
}): string {
  let prompt = `Create a ${payload.difficulty} mini-lesson about "${payload.topic}".`
  if (payload.includeExamples) prompt += " Include practical code examples."
  if (payload.autoQuiz) prompt += " Generate quiz questions at the end."
  return prompt
}

export function buildDebugPrompt(code: string): string {
  return `Help me debug this C++ code. Analyze for errors, suggest fixes, and explain what went wrong:\n\n\`\`\`cpp\n${code}\n\`\`\``
}

export function buildExecutionTracePrompt(code: string): string {
  return `Show me a detailed execution trace for this C++ code, step by step with variable values at each step:\n\n\`\`\`cpp\n${code}\n\`\`\``
}

export function buildStudyNotesPrompt(code: string): string {
  return `Generate comprehensive documentation for this C++ code:\n\n\`\`\`cpp\n${code}\n\`\`\``
}

export function buildPasteCodePrompt(code: string): string {
  return `Please help me with this code:\n\n\`\`\`\n${code}\n\`\`\``
}

export function buildMoreToolPrompt(
  toolId: CoraComposerActionId,
  code?: string,
  targetLanguage = "python",
): string {
  switch (toolId) {
    case "alternative-solutions":
      return "Show me alternative solutions to this problem. Present different approaches and explain the trade-offs."
    case "complexity-analysis":
      return code
        ? `Analyze the time and space complexity of this code:\n\n\`\`\`cpp\n${code}\n\`\`\``
        : "Analyze the time and space complexity of this approach and suggest improvements if needed."
    case "refactor-mode":
      return code
        ? `Refactor this code to improve readability, maintainability, and best practices:\n\n\`\`\`cpp\n${code}\n\`\`\``
        : "Help me refactor this code for clarity, correctness, and efficiency."
    case "exam-prep-mode":
      return "Switch to exam prep mode — quiz me with exam-style questions and explain any mistakes."
    case "explain-thinking":
      return code
        ? `Review my problem-solving approach and explain my thinking process:\n\n\`\`\`cpp\n${code}\n\`\`\``
        : "Explain my thinking based on what I've said so far and point out where I might have gone wrong."
    case "code-translator":
      return code
        ? `Translate this C++ code to ${targetLanguage} and explain any important differences:\n\n\`\`\`cpp\n${code}\n\`\`\``
        : `Translate this C++ code to ${targetLanguage} and explain any important differences.`
    default:
      return ""
  }
}
