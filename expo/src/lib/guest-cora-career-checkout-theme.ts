import type { AppThemeTokens, ThemeId } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"
import type { CheckoutHeroPalette } from "./membership-checkout-hero-theme"

export type GuestCareerCheckoutThemeId =
  | "executive-indigo"
  | "horizon-teal"
  | "lifetime-amber"
  | "twilight-violet"

export type GuestCareerCheckoutTheme = {
  id: GuestCareerCheckoutThemeId
  label: string
  palette: CheckoutHeroPalette
  highlight: string
  highlightDark: string
  cta: string
  ctaText: string
  secondaryBorder: string
  secondaryText: string
  perkIconBg: string
  perkIconColor: string
  heroGradientDark: [string, string, string]
  heroGradientLight: [string, string, string]
  glowPrimary: string
  glowSecondary: string
  ringOuter: string
  ringInner: string
  /** Hero tool chips — accent only, neutral card body (Color Hunt pattern). */
  chipAccents: readonly [string, string, string, string]
  /** Rotating semantic thumb fills for perk rows. */
  perkThumbAccents: readonly string[]
  creditsAccent: string
  offerSoft: string
}

export type GuestCareerTheme = GuestCareerCheckoutTheme

type ThemeSeed = Omit<GuestCareerCheckoutTheme, "id">

const EXECUTIVE_INDIGO: ThemeSeed = {
  label: "Executive Indigo",
  palette: { name: "Cora Career", accent: "#818CF8", accentDark: "#4F46E5" },
  highlight: "#A5B4FC",
  highlightDark: "#4338CA",
  cta: "#4F46E5",
  ctaText: "#FFFFFF",
  secondaryBorder: hexToRgba("#818CF8", 0.35),
  secondaryText: "#C7D2FE",
  perkIconBg: hexToRgba("#6366F1", 0.18),
  perkIconColor: "#A5B4FC",
  heroGradientDark: ["#0B1020", "#151B38", "#1E1B4B"],
  heroGradientLight: ["#FFFFFF", "#F5F7FF", "#EEF2FF"],
  glowPrimary: hexToRgba("#6366F1", 0.34),
  glowSecondary: hexToRgba("#38BDF8", 0.16),
  ringOuter: hexToRgba("#818CF8", 0.2),
  ringInner: hexToRgba("#38BDF8", 0.12),
  chipAccents: ["#818CF8", "#38BDF8", "#FFC349", "#5FACD3"],
  perkThumbAccents: ["#818CF8", "#38BDF8", "#525EA7", "#5FACD3", "#FFC349", "#97DDE9", "#6366F1"],
  creditsAccent: "#FFC349",
  offerSoft: hexToRgba("#6366F1", 0.2),
}

const HORIZON_TEAL: ThemeSeed = {
  label: "Horizon Teal",
  palette: { name: "Cora Career", accent: "#2DD4BF", accentDark: "#0F766E" },
  highlight: "#5EEAD4",
  highlightDark: "#0D9488",
  cta: "#0F766E",
  ctaText: "#FFFFFF",
  secondaryBorder: hexToRgba("#2DD4BF", 0.34),
  secondaryText: "#99F6E4",
  perkIconBg: hexToRgba("#14B8A6", 0.18),
  perkIconColor: "#5EEAD4",
  heroGradientDark: ["#071816", "#0C2421", "#134E4A"],
  heroGradientLight: ["#FFFFFF", "#F0FDFA", "#CCFBF1"],
  glowPrimary: hexToRgba("#14B8A6", 0.32),
  glowSecondary: hexToRgba("#FBBF24", 0.14),
  ringOuter: hexToRgba("#2DD4BF", 0.2),
  ringInner: hexToRgba("#FBBF24", 0.12),
  chipAccents: ["#14B8A6", "#5FACD3", "#FFC349", "#34D399"],
  perkThumbAccents: ["#14B8A6", "#5FACD3", "#0D9488", "#FFC349", "#97DDE9", "#2DD4BF", "#10B981"],
  creditsAccent: "#FFC349",
  offerSoft: hexToRgba("#14B8A6", 0.2),
}

const LIFETIME_AMBER: ThemeSeed = {
  label: "Lifetime Amber",
  palette: { name: "Cora Career", accent: "#FBBF24", accentDark: "#D97706" },
  highlight: "#FCD34D",
  highlightDark: "#B45309",
  cta: "#C2410C",
  ctaText: "#FFFFFF",
  secondaryBorder: hexToRgba("#FBBF24", 0.34),
  secondaryText: "#FDE68A",
  perkIconBg: hexToRgba("#F59E0B", 0.18),
  perkIconColor: "#FCD34D",
  heroGradientDark: ["#140E08", "#24180E", "#3D2612"],
  heroGradientLight: ["#FFFFFF", "#FFFBEB", "#FEF3C7"],
  glowPrimary: hexToRgba("#F59E0B", 0.3),
  glowSecondary: hexToRgba("#FB7185", 0.12),
  ringOuter: hexToRgba("#FBBF24", 0.22),
  ringInner: hexToRgba("#FB923C", 0.14),
  chipAccents: ["#FBBF24", "#FB7185", "#FB6C00", "#FCD34D"],
  perkThumbAccents: ["#FBBF24", "#FB7185", "#FB6C00", "#FFAE56", "#F5788B", "#F9B637", "#E05510"],
  creditsAccent: "#FFAE56",
  offerSoft: hexToRgba("#F59E0B", 0.22),
}

const TWILIGHT_VIOLET: ThemeSeed = {
  label: "Twilight Violet",
  palette: { name: "Cora Career", accent: "#C4B5FD", accentDark: "#7C3AED" },
  highlight: "#DDD6FE",
  highlightDark: "#6D28D9",
  cta: "#7C3AED",
  ctaText: "#FFFFFF",
  secondaryBorder: hexToRgba("#C4B5FD", 0.34),
  secondaryText: "#E9D5FF",
  perkIconBg: hexToRgba("#8B5CF6", 0.18),
  perkIconColor: "#DDD6FE",
  heroGradientDark: ["#100B18", "#1A1030", "#2E1065"],
  heroGradientLight: ["#FFFFFF", "#FAF5FF", "#F3E8FF"],
  glowPrimary: hexToRgba("#8B5CF6", 0.32),
  glowSecondary: hexToRgba("#F472B6", 0.14),
  ringOuter: hexToRgba("#C4B5FD", 0.2),
  ringInner: hexToRgba("#F472B6", 0.12),
  chipAccents: ["#C4B5FD", "#F472B6", "#818CF8", "#FFC349"],
  perkThumbAccents: ["#A78BFA", "#F472B6", "#818CF8", "#C084FC", "#FFC349", "#E879F9", "#8B5CF6"],
  creditsAccent: "#FFC349",
  offerSoft: hexToRgba("#8B5CF6", 0.2),
}

const CAREER_THEMES: Record<GuestCareerCheckoutThemeId, ThemeSeed> = {
  "executive-indigo": EXECUTIVE_INDIGO,
  "horizon-teal": HORIZON_TEAL,
  "lifetime-amber": LIFETIME_AMBER,
  "twilight-violet": TWILIGHT_VIOLET,
}

const THEME_BY_APPEARANCE: Partial<Record<ThemeId, GuestCareerCheckoutThemeId>> = {
  ocean: "horizon-teal",
  emerald: "horizon-teal",
  "forest-mist": "horizon-teal",
  "meridian-teal": "horizon-teal",
  "liquid-ocean": "horizon-teal",
  arctic: "horizon-teal",
  "course-collab": "horizon-teal",
  midnight: "executive-indigo",
  carbon: "executive-indigo",
  "graphite-dark": "executive-indigo",
  "obsidian-glass": "executive-indigo",
  "executive-navy": "executive-indigo",
  indigo: "executive-indigo",
  "university-of-houston-steel": "executive-indigo",
  sunset: "lifetime-amber",
  "pvamu-gold": "lifetime-amber",
  "copper-luxe": "lifetime-amber",
  "cougar-crimson": "lifetime-amber",
  "professional-crimson": "lifetime-amber",
  "apple-lavender": "twilight-violet",
  aurora: "twilight-violet",
  "pvamu-purple": "twilight-violet",
  "heritage-wine": "twilight-violet",
  "rose-quartz": "twilight-violet",
}

function withId(id: GuestCareerCheckoutThemeId, seed: ThemeSeed): GuestCareerCheckoutTheme {
  return { id, ...seed }
}

function blendChannel(career: number, user: number, weightCareer: number): number {
  return Math.round(career * weightCareer + user * (1 - weightCareer))
}

function blendHex(career: string, user: string, weightCareer = 0.82): string {
  const parse = (hex: string) => {
    const normalized = hex.replace("#", "").slice(0, 6)
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    }
  }
  const a = parse(career)
  const b = parse(user)
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0")
  return `#${toHex(blendChannel(a.r, b.r, weightCareer))}${toHex(blendChannel(a.g, b.g, weightCareer))}${toHex(blendChannel(a.b, b.b, weightCareer))}`
}

export function resolveGuestCareerCheckoutTheme(tokens: AppThemeTokens): GuestCareerCheckoutTheme {
  const themeId = THEME_BY_APPEARANCE[tokens.id] ?? "twilight-violet"
  const seed = CAREER_THEMES[themeId]
  const cta = blendHex(seed.cta, tokens.accentDark, 0.78)
  const highlight = blendHex(seed.highlight, tokens.accent, 0.72)

  return withId(themeId, {
    ...seed,
    palette: {
      name: seed.palette.name,
      accent: blendHex(seed.palette.accent, tokens.accent, 0.7),
      accentDark: blendHex(seed.palette.accentDark, tokens.accentDark, 0.75),
    },
    highlight,
    highlightDark: blendHex(seed.highlightDark, tokens.accentDark, 0.75),
    cta,
    perkIconColor: highlight,
    perkIconBg: hexToRgba(cta, tokens.isDark ? 0.2 : 0.12),
    secondaryText: tokens.isDark ? seed.secondaryText : blendHex(seed.highlightDark, tokens.accentDark, 0.55),
    secondaryBorder: hexToRgba(cta, tokens.isDark ? 0.34 : 0.24),
    offerSoft: hexToRgba(cta, tokens.isDark ? 0.22 : 0.14),
  })
}

/** Shared career module palette for marketing + checkout screens. */
export const resolveGuestCareerTheme = resolveGuestCareerCheckoutTheme

export function guestCareerCheckoutHeroColors(
  theme: GuestCareerCheckoutTheme,
  tokens: AppThemeTokens,
) {
  const gradient = tokens.isDark ? theme.heroGradientDark : theme.heroGradientLight
  return {
    gradient,
    border: hexToRgba(theme.palette.accent, tokens.isDark ? 0.28 : 0.22),
    tierLabel: tokens.isDark ? theme.highlight : theme.highlightDark,
    iconChipBg: hexToRgba(theme.palette.accent, tokens.isDark ? 0.18 : 0.12),
    iconChipColor: theme.palette.accent,
    sparkleColor: theme.highlight,
    headline: tokens.isDark ? "#FFFFFF" : tokens.text,
    headlineAccent: theme.highlight,
    body: tokens.isDark ? "rgba(255, 255, 255, 0.72)" : tokens.textSecondary,
    price: tokens.isDark ? "#FFFFFF" : tokens.text,
    checkColor: theme.highlight,
    meta: tokens.isDark ? "rgba(255, 255, 255, 0.58)" : tokens.textMuted,
  }
}
