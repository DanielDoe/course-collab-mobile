export const PROJECT_TARGET_PLATFORM_OTHER = "Other"

export const PROJECT_TARGET_PLATFORM_OPTIONS = [
  { value: "Web app", label: "Web app", icon: "globe-outline" as const },
  { value: "Desktop app", label: "Desktop app", icon: "desktop-outline" as const },
  { value: "Mobile app", label: "Mobile app", icon: "phone-portrait-outline" as const },
  { value: "Game", label: "Game", icon: "game-controller-outline" as const },
  { value: "Console app", label: "Console app", icon: "terminal-outline" as const },
  { value: "Embedded / hardware", label: "Embedded / hardware", icon: "hardware-chip-outline" as const },
  { value: "Library / SDK", label: "Library / SDK", icon: "code-slash-outline" as const },
  { value: PROJECT_TARGET_PLATFORM_OTHER, label: "Other", icon: "ellipsis-horizontal-outline" as const },
]

const PRESET_VALUES = new Set(
  PROJECT_TARGET_PLATFORM_OPTIONS.map((option) => option.value).filter(
    (value) => value !== PROJECT_TARGET_PLATFORM_OTHER,
  ),
)

export function splitProjectTargetPlatform(raw: string | null | undefined): {
  preset: string
  custom: string
} {
  const value = String(raw ?? "").trim()
  if (!value) return { preset: "", custom: "" }
  if (PRESET_VALUES.has(value)) return { preset: value, custom: "" }
  return { preset: PROJECT_TARGET_PLATFORM_OTHER, custom: value === PROJECT_TARGET_PLATFORM_OTHER ? "" : value }
}

export function composeProjectTargetPlatform(preset: string, custom: string): string {
  if (preset === PROJECT_TARGET_PLATFORM_OTHER) return custom.trim() || PROJECT_TARGET_PLATFORM_OTHER
  return preset.trim()
}
