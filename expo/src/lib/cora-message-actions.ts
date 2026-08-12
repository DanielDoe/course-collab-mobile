import type { Ionicons } from "@/components/icons/AppIcon"

export type CoraMessageMenuActionId =
  | "save-note"
  | "regenerate"
  | "explain-simpler"
  | "create-flashcards"
  | "branch-chat"
  | "double-check"
  | "report-concern"
  | "copy"

export type CoraMessageMenuItem = {
  id: CoraMessageMenuActionId
  label: string
  icon: keyof typeof Ionicons.glyphMap
  assistantOnly?: boolean
  lastResponseOnly?: boolean
  destructive?: boolean
}

export const CORA_MESSAGE_MENU_ITEMS: CoraMessageMenuItem[] = [
  {
    id: "save-note",
    label: "Save to My Notes",
    icon: "document-text-outline",
    assistantOnly: true,
  },
  {
    id: "regenerate",
    label: "Regenerate answer",
    icon: "refresh-outline",
    assistantOnly: true,
    lastResponseOnly: true,
  },
  {
    id: "explain-simpler",
    label: "Explain simpler",
    icon: "bulb-outline",
    assistantOnly: true,
  },
  {
    id: "create-flashcards",
    label: "Create flashcards",
    icon: "layers-outline",
    assistantOnly: true,
  },
  {
    id: "branch-chat",
    label: "Branch in new chat",
    icon: "git-branch-outline",
    assistantOnly: true,
  },
  {
    id: "double-check",
    label: "Double-check answer",
    icon: "shield-checkmark-outline",
    assistantOnly: true,
  },
  {
    id: "copy",
    label: "Copy text",
    icon: "copy-outline",
  },
  {
    id: "report-concern",
    label: "Report a concern",
    icon: "flag-outline",
    destructive: true,
  },
]
