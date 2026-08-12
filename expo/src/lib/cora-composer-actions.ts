import type { Ionicons } from "@/components/icons/AppIcon"

export type CoraComposerActionId =
  | "upload-files"
  | "upload-photos"
  | "import-course"
  | "concept"
  | "mini-lesson"
  | "debug"
  | "debug-trace"
  | "doc-generator"
  | "paste-code"
  | "alternative-solutions"
  | "complexity-analysis"
  | "refactor-mode"
  | "exam-prep-mode"
  | "explain-thinking"
  | "code-translator"

export type CoraComposerMenuItem = {
  id: CoraComposerActionId
  label: string
  icon: keyof typeof Ionicons.glyphMap
  section: "input" | "learning" | "more"
  prompt?: string
  opensSheet?: "paste-code" | "import-course"
}

export const CORA_COMPOSER_INPUT_ACTIONS: CoraComposerMenuItem[] = [
  { id: "upload-files", label: "Upload files", icon: "attach-outline", section: "input" },
  { id: "upload-photos", label: "Upload photos", icon: "image-outline", section: "input" },
  {
    id: "import-course",
    label: "Import from course",
    icon: "book-outline",
    section: "input",
    opensSheet: "import-course",
  },
]

export const CORA_COMPOSER_LEARNING_ACTIONS: CoraComposerMenuItem[] = [
  {
    id: "concept",
    label: "Explain a concept",
    icon: "bulb-outline",
    section: "learning",
    prompt:
      "Help me understand a concept from my course. Ask what topic I'm on, then explain it clearly with intuition and a simple example.",
  },
  {
    id: "mini-lesson",
    label: "Micro-lesson",
    icon: "star-outline",
    section: "learning",
    prompt:
      "Give me a micro-lesson on a topic from my course. Keep it concise with one worked example and a quick check-for-understanding question.",
  },
  {
    id: "debug",
    label: "Fix my code",
    icon: "bug-outline",
    section: "learning",
    prompt: "Help me fix my code. I'll paste it next — walk me through bugs and better patterns.",
  },
  {
    id: "debug-trace",
    label: "Execution trace",
    icon: "eye-outline",
    section: "learning",
    prompt: "Walk me through an execution trace for my code step by step so I can see what happens at runtime.",
  },
  {
    id: "doc-generator",
    label: "Generate study notes",
    icon: "document-text-outline",
    section: "learning",
    prompt: "Generate study notes from this conversation. Use headings, bullet points, and key definitions.",
  },
  {
    id: "paste-code",
    label: "Paste code",
    icon: "code-slash-outline",
    section: "learning",
    opensSheet: "paste-code",
  },
]

export const CORA_COMPOSER_MORE_ACTIONS: CoraComposerMenuItem[] = [
  {
    id: "alternative-solutions",
    label: "Alternative solutions",
    icon: "git-branch-outline",
    section: "more",
    prompt: "Show me alternative ways to solve this problem and compare trade-offs.",
  },
  {
    id: "complexity-analysis",
    label: "Complexity analysis",
    icon: "analytics-outline",
    section: "more",
    prompt: "Analyze the time and space complexity of this approach and suggest improvements if needed.",
  },
  {
    id: "refactor-mode",
    label: "Refactor mode",
    icon: "construct-outline",
    section: "more",
    prompt: "Help me refactor this code for clarity, correctness, and efficiency.",
  },
  {
    id: "exam-prep-mode",
    label: "Exam prep",
    icon: "school-outline",
    section: "more",
    prompt: "Switch to exam prep mode — quiz me with exam-style questions and explain any mistakes.",
  },
  {
    id: "explain-thinking",
    label: "Explain my thinking",
    icon: "chatbubble-ellipses-outline",
    section: "more",
    prompt: "Explain my thinking based on what I've said so far and point out where I might have gone wrong.",
  },
  {
    id: "code-translator",
    label: "C++ → Python",
    icon: "swap-horizontal-outline",
    section: "more",
    prompt: "Translate this C++ code to Python and explain any important differences.",
  },
]

export function findComposerAction(id: CoraComposerActionId): CoraComposerMenuItem | undefined {
  return (
    CORA_COMPOSER_INPUT_ACTIONS.find((item) => item.id === id) ??
    CORA_COMPOSER_LEARNING_ACTIONS.find((item) => item.id === id) ??
    CORA_COMPOSER_MORE_ACTIONS.find((item) => item.id === id)
  )
}
