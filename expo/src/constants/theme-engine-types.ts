/**
 * JSON-serializable theme configuration — marketplace / remote theme packs.
 * UI must consume resolved AppThemeTokens only; never read this shape directly in components.
 */
export type ThemeCategory = "light" | "dark" | "glass" | "enterprise" | "organic"

export type ThemeConfigJson = {
  id: string
  name: string
  tagline: string
  category: ThemeCategory
  mode?: "light" | "dark" | "adaptive"
  isDefault?: boolean
  forceDark?: boolean
  colors: {
    accent: string
    accentHover: string
    secondaryAccent?: string
    tint: string
    selected: string
    border: string
    surface: string
    elevatedSurface?: string
    background: string
    card: string
    text: string
    textSecondary: string
    textMuted: string
    success: string
    warning: string
    danger: string
  }
  gradients?: {
    background?: string[]
    hero?: string[]
  }
  glass?: {
    surface: string
    border: string
    blurRadius: number
    highlight?: string
  }
  shadows?: {
    card?: { shadowOpacity?: number; shadowRadius?: number; elevation?: number }
  }
  charts?: string[]
  typography?: { scale?: "default" | "compact" }
  buttons?: { radius?: number; style?: "filled" | "glass" }
  navigation?: { style?: "standard" | "floating-glass" }
}
