export type CoraLearningGoalId =
  | "understand"
  | "solve_together"
  | "review"
  | "prepare"
  | "create"

export type CoraLearningGoal = {
  id: CoraLearningGoalId
  emoji: string
  label: string
  shortLabel: string
  tagline: string
  starterPrompt: string
  featured?: boolean
}

export const CORA_LEARNING_GOALS: CoraLearningGoal[] = [
  {
    id: "understand",
    emoji: "💡",
    label: "Understand",
    shortLabel: "Understand",
    tagline: "Teach and explain concepts",
    starterPrompt:
      "Help me understand a concept from my course. Break it down step by step with examples.",
  },
  {
    id: "solve_together",
    emoji: "🧩",
    label: "Solve Together",
    shortLabel: "Solve",
    tagline: "Work through problems step by step",
    starterPrompt:
      "Let's solve a problem together. Guide me step by step and check my understanding along the way.",
    featured: true,
  },
  {
    id: "review",
    emoji: "🔍",
    label: "Review & Improve",
    shortLabel: "Review",
    tagline: "Get feedback on your work",
    starterPrompt:
      "I want to review and improve my work. Point out gaps and suggest concrete improvements.",
  },
  {
    id: "prepare",
    emoji: "🎯",
    label: "Prepare",
    shortLabel: "Prepare",
    tagline: "Get ready for assessments",
    starterPrompt:
      "Help me prepare for an upcoming assessment with a focused review plan and practice questions.",
  },
  {
    id: "create",
    emoji: "🚀",
    label: "Create",
    shortLabel: "Create",
    tagline: "Generate learning resources",
    starterPrompt:
      "Help me create a learning resource — notes, flashcards, or a study outline — from my course material.",
  },
]

export const CORA_WELCOME_MARKDOWN = `**Welcome to Cora! ✨**

I'm your personal learning intelligence — not just answers, but guided problem-solving across your course.

- **Interactive Solve** — step-by-step with animations and checkpoints
- **Code debugging** and execution tracing
- **Concept explanations** aligned with your lectures
- **Study plans** and exam preparation
- **Course-aware** responses using instructor materials

💡 Tip: Paste problems in **Solve**, or use **Workspace** for open-ended work.

**How can I help you learn today?**`

export const CORA_HISTORY_HELPER =
  "Each chat is saved automatically. Select a title to open its complete thread."
