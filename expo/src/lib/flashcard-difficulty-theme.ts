import {
  normalizeFlashcardDifficulty,
  type FlashcardDifficulty,
} from "./flashcard-difficulty"
import type {
  FlashcardWabiFace,
  FlashcardWabiStackLayer,
  FlashcardWabiTheme,
} from "./flashcard-wabi-theme"

/**
 * Color Hunt palette — https://colorhunt.co/palette/ff6a1cffda62ffae56f5788b
 * Orange · Yellow · Amber · Pink
 */
export const COLOR_HUNT = {
  orange: "#FF6A1C",
  yellow: "#FFDA62",
  amber: "#FFAE56",
  pink: "#F5788B",
  yellowLight: "#FFE999",
  amberLight: "#FFD099",
  orangeDeep: "#E05510",
  pinkDeep: "#D86176",
  ink: "#4A2E0A",
} as const

const STACK_GEOMETRY: Pick<
  FlashcardWabiStackLayer,
  "rotate" | "offsetX" | "offsetY" | "scale"
>[] = [
  { rotate: "-12deg", offsetX: -18, offsetY: 16, scale: 0.96 },
  { rotate: "11deg", offsetX: 18, offsetY: 20, scale: 0.94 },
  { rotate: "6deg", offsetX: 0, offsetY: 24, scale: 0.92 },
]

/** Stack peek — each outline matches its fill. */
const COLOR_HUNT_STACK: Array<{ background: string; border: string }> = [
  { background: COLOR_HUNT.pink, border: COLOR_HUNT.pink },
  { background: COLOR_HUNT.orange, border: COLOR_HUNT.orange },
  { background: COLOR_HUNT.yellow, border: COLOR_HUNT.yellow },
]

const WARM_INK = COLOR_HUNT.ink
const LIGHT_INK = "#334155"

type DifficultyPalette = {
  front: string
  back: string
  orb: string
  title: string
  body: string
  footer: string
  shadow: string
  divider: string
}

const DARK_DIFFICULTY: Record<FlashcardDifficulty, DifficultyPalette> = {
  easy: {
    front: COLOR_HUNT.yellow,
    back: "#E6C24F",
    orb: COLOR_HUNT.yellowLight,
    title: WARM_INK,
    body: WARM_INK,
    footer: WARM_INK,
    shadow: "rgba(255,218,98,0.62)",
    divider: "rgba(74,46,10,0.22)",
  },
  medium: {
    front: COLOR_HUNT.amber,
    back: "#E89842",
    orb: COLOR_HUNT.amberLight,
    title: WARM_INK,
    body: WARM_INK,
    footer: WARM_INK,
    shadow: "rgba(255,174,86,0.62)",
    divider: "rgba(74,46,10,0.22)",
  },
  hard: {
    front: COLOR_HUNT.orange,
    back: COLOR_HUNT.orangeDeep,
    orb: "#FFAB80",
    title: "#FFFFFF",
    body: "#FFF7ED",
    footer: COLOR_HUNT.yellowLight,
    shadow: "rgba(255,106,28,0.65)",
    divider: "rgba(255,255,255,0.36)",
  },
  very_hard: {
    front: COLOR_HUNT.pink,
    back: COLOR_HUNT.pinkDeep,
    orb: "#FAC0CB",
    title: "#FFFFFF",
    body: "#FFF1F3",
    footer: COLOR_HUNT.yellowLight,
    shadow: "rgba(245,120,139,0.65)",
    divider: "rgba(255,255,255,0.36)",
  },
}

const LIGHT_DIFFICULTY: Record<FlashcardDifficulty, DifficultyPalette> = {
  easy: {
    front: COLOR_HUNT.yellow,
    back: COLOR_HUNT.yellowLight,
    orb: "#FFFBEB",
    title: WARM_INK,
    body: LIGHT_INK,
    footer: WARM_INK,
    shadow: "rgba(255,218,98,0.24)",
    divider: "rgba(74,46,10,0.14)",
  },
  medium: {
    front: COLOR_HUNT.amber,
    back: COLOR_HUNT.amberLight,
    orb: "#FFF8EF",
    title: WARM_INK,
    body: LIGHT_INK,
    footer: WARM_INK,
    shadow: "rgba(255,174,86,0.24)",
    divider: "rgba(74,46,10,0.14)",
  },
  hard: {
    front: COLOR_HUNT.orange,
    back: COLOR_HUNT.orangeDeep,
    orb: "#FFF0E8",
    title: "#FFFFFF",
    body: "#FFF7ED",
    footer: WARM_INK,
    shadow: "rgba(255,106,28,0.24)",
    divider: "rgba(255,255,255,0.32)",
  },
  very_hard: {
    front: COLOR_HUNT.pink,
    back: COLOR_HUNT.pinkDeep,
    orb: "#FFF1F4",
    title: "#FFFFFF",
    body: "#FFF1F3",
    footer: WARM_INK,
    shadow: "rgba(245,120,139,0.24)",
    divider: "rgba(255,255,255,0.32)",
  },
}

function buildFace(palette: DifficultyPalette): FlashcardWabiFace {
  return {
    background: palette.front,
    border: palette.front,
    orb: palette.orb,
    title: palette.title,
    body: palette.body,
    footer: palette.footer,
    divider: palette.divider,
    shadow: palette.shadow,
  }
}

function buildBackFace(palette: DifficultyPalette): FlashcardWabiFace {
  return {
    background: palette.back,
    border: palette.back,
    orb: palette.orb,
    title: palette.title,
    body: palette.body,
    footer: palette.footer,
    divider: palette.divider,
    shadow: palette.shadow,
  }
}

export function buildColorHuntStackLayers(): FlashcardWabiStackLayer[] {
  return STACK_GEOMETRY.map((geometry, index) => {
    const colors = COLOR_HUNT_STACK[index] ?? COLOR_HUNT_STACK[0]!
    return {
      ...geometry,
      background: colors.background,
      border: colors.border,
    }
  })
}

export function flashcardStackLayersForDifficulties(
  _current: FlashcardDifficulty,
  _upcoming?: Array<FlashcardDifficulty | string | null | undefined>,
): FlashcardWabiStackLayer[] {
  return buildColorHuntStackLayers()
}

export function flashcardWabiThemeForDifficulty(
  difficulty: FlashcardDifficulty,
  isDark: boolean,
  _upcomingStackDifficulties?: Array<FlashcardDifficulty | string | null | undefined>,
): FlashcardWabiTheme {
  const normalized = normalizeFlashcardDifficulty(difficulty)
  const palette = isDark ? DARK_DIFFICULTY[normalized] : LIGHT_DIFFICULTY[normalized]
  return {
    front: buildFace(palette),
    back: buildBackFace(palette),
    stack: buildColorHuntStackLayers(),
  }
}

const BADGE_COLORS: Record<FlashcardDifficulty, { background: string; border: string; text: string }> = {
  easy: { background: COLOR_HUNT.yellow, border: COLOR_HUNT.yellow, text: WARM_INK },
  medium: { background: COLOR_HUNT.amber, border: COLOR_HUNT.amber, text: WARM_INK },
  hard: { background: COLOR_HUNT.orange, border: COLOR_HUNT.orange, text: "#FFFFFF" },
  very_hard: { background: COLOR_HUNT.pink, border: COLOR_HUNT.pink, text: "#FFFFFF" },
}

export function flashcardDifficultyBadgeStyle(
  difficulty: FlashcardDifficulty,
  _isDark: boolean,
): { backgroundColor: string; color: string; borderColor: string } {
  const normalized = normalizeFlashcardDifficulty(difficulty)
  const badge = BADGE_COLORS[normalized]
  return {
    backgroundColor: badge.background,
    color: badge.text,
    borderColor: badge.border,
  }
}
