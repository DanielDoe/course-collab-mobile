import { hexToRgba } from "../constants/app-themes"
import { TABLET_MIN_WIDTH } from "./responsive-layout"

/** Wabi card face — solid surface, navy typography. */
export type FlashcardWabiFace = {
  background: string
  border: string
  orb: string
  title: string
  body: string
  footer: string
  divider: string
  shadow: string
}

export type FlashcardWabiStackLayer = {
  background: string
  border: string
  rotate: string
  offsetX: number
  offsetY: number
  scale: number
}

export type FlashcardWabiTheme = {
  front: FlashcardWabiFace
  back: FlashcardWabiFace
  stack: FlashcardWabiStackLayer[]
}

const INK = {
  title: "#1B3A5C",
  body: "#3B6B8C",
  footer: "#6B8FA8",
} as const

const WABI_PASTELS = {
  cyanFace: ["#DDF4FF", "#EAF8FF"] as [string, string],
  blueFace: ["#D9EEFF", "#E8F6FF"] as [string, string],
  lavenderFace: ["#EDE8FF", "#F3EEFF"] as [string, string],
  stackLavender: "#E8DEFF",
  stackCyan: "#C8F5FF",
  stackBlue: "#D4ECFF",
} as const

const DARK_WABI_FACES = {
  /** Electric cyan — top-of-card lighter, base saturated. */
  teal: ["#0E7490", "#06B6D4"] as [string, string],
  blue: ["#1D4ED8", "#3B82F6"] as [string, string],
  violet: ["#7C3AED", "#A855F7"] as [string, string],
  backTeal: ["#0F766E", "#14B8A6"] as [string, string],
  backBlue: ["#4338CA", "#6366F1"] as [string, string],
  backViolet: ["#A21CAF", "#D946EF"] as [string, string],
} as const

const DARK_WABI_STACK: FlashcardWabiStackLayer[] = [
  {
    background: "#8B5CF6",
    border: "#DDD6FE",
    rotate: "-11deg",
    offsetX: -14,
    offsetY: 14,
    scale: 0.96,
  },
  {
    background: "#06B6D4",
    border: "#A5F3FC",
    rotate: "10deg",
    offsetX: 14,
    offsetY: 18,
    scale: 0.94,
  },
  {
    background: "#3B82F6",
    border: "#BFDBFE",
    rotate: "5deg",
    offsetX: 0,
    offsetY: 22,
    scale: 0.92,
  },
]

export function flashcardWabiTheme(
  cardIndex: number,
  isDark: boolean,
): FlashcardWabiTheme {
  const variant = cardIndex % 3
  const frontBackground =
    variant === 0
      ? WABI_PASTELS.cyanFace
      : variant === 1
        ? WABI_PASTELS.blueFace
        : WABI_PASTELS.lavenderFace

  if (isDark) {
    const frontBg =
      variant === 0
        ? DARK_WABI_FACES.teal
        : variant === 1
          ? DARK_WABI_FACES.blue
          : DARK_WABI_FACES.violet
    const backBg =
      variant === 0
        ? DARK_WABI_FACES.backTeal
        : variant === 1
          ? DARK_WABI_FACES.backBlue
          : DARK_WABI_FACES.backViolet

    const front: FlashcardWabiFace = {
      background: frontBg[0],
      border: frontBg[0],
      orb:
        variant === 0
          ? "#22D3EE"
          : variant === 1
            ? "#60A5FA"
            : "#C084FC",
      title: "#FFFFFF",
      body: "#F1F5F9",
      footer: variant === 0 ? "#67E8F9" : variant === 1 ? "#93C5FD" : "#E9D5FF",
      divider: "rgba(255,255,255,0.32)",
      shadow:
        variant === 0
          ? "rgba(6,182,212,0.55)"
          : variant === 1
            ? "rgba(59,130,246,0.52)"
            : "rgba(168,85,247,0.52)",
    }
    return {
      front,
      back: {
        ...front,
        background: backBg[0],
        border: backBg[0],
        orb: "#E879F9",
        footer: "#F5D0FE",
        shadow: "rgba(217,70,239,0.5)",
      },
      stack: DARK_WABI_STACK,
    }
  }

  const front: FlashcardWabiFace = {
    background: frontBackground[0],
    border: frontBackground[0],
    orb: "#60A5FA",
    title: INK.title,
    body: INK.body,
    footer: INK.footer,
    divider: hexToRgba(INK.body, 0.18),
    shadow: hexToRgba(INK.title, 0.14),
  }

  return {
    front,
    back: {
      background: WABI_PASTELS.lavenderFace[0],
      border: WABI_PASTELS.lavenderFace[0],
      orb: "#A78BFA",
      title: INK.title,
      body: INK.body,
      footer: INK.footer,
      divider: hexToRgba(INK.body, 0.18),
      shadow: hexToRgba("#5B21B6", 0.12),
    },
    stack: [
      {
        background: WABI_PASTELS.stackLavender,
        border: WABI_PASTELS.stackLavender,
        rotate: "-11deg",
        offsetX: -14,
        offsetY: 14,
        scale: 0.96,
      },
      {
        background: WABI_PASTELS.stackCyan,
        border: WABI_PASTELS.stackCyan,
        rotate: "10deg",
        offsetX: 14,
        offsetY: 18,
        scale: 0.94,
      },
      {
        background: WABI_PASTELS.stackBlue,
        border: WABI_PASTELS.stackBlue,
        rotate: "5deg",
        offsetX: 0,
        offsetY: 22,
        scale: 0.92,
      },
    ],
  }
}

/** @deprecated use flashcardWabiTheme */
export function flashcardWabiPalette(tokens: {
  surface: string
  text: string
  textSecondary: string
  isDark: boolean
}) {
  const theme = flashcardWabiTheme(0, tokens.isDark)
  return {
    cardSurface: theme.front.background,
    cardBorder: theme.front.divider,
    headerGradient: [theme.front.background, theme.front.background] as [string, string],
    orbGradient: [theme.front.orb, theme.front.orb, theme.front.orb] as [string, string, string],
    title: theme.front.title,
    body: theme.front.body,
    footer: theme.front.footer,
    stackLeft: theme.stack[0].background,
    stackRight: theme.stack[1].background,
    stackBorderLeft: theme.stack[0].border,
    stackBorderRight: theme.stack[1].border,
    answerGradient: [theme.back.background, theme.back.background] as [string, string],
    answerTitle: theme.back.title,
    answerBody: theme.back.body,
    shadow: theme.front.shadow,
  }
}

export const FLASHCARD_WABI_RADIUS = 32
export const FLASHCARD_WABI_MAX_WIDTH = 272
export const FLASHCARD_WABI_TABLET_MAX_WIDTH = 480
/** Minimum inset from screen edge for the card stack (each side). */
export const FLASHCARD_WABI_SCREEN_GUTTER = 36
export const FLASHCARD_WABI_TABLET_SCREEN_GUTTER = 56
/** Extra room so rotated peek cards do not touch the screen edge. */
export const FLASHCARD_WABI_STACK_BLEED = 18
export const FLASHCARD_WABI_CARD_HEIGHT = 400
export const FLASHCARD_WABI_TABLET_CARD_HEIGHT = 520
/** Reserved vertical space for peek stack + card (keeps layout stable during flip). */
export const FLASHCARD_WABI_STAGE_HEIGHT = 430
export const FLASHCARD_WABI_TABLET_STAGE_HEIGHT = 560

export function flashcardWabiScreenGutter(screenWidth: number): number {
  return screenWidth >= TABLET_MIN_WIDTH
    ? FLASHCARD_WABI_TABLET_SCREEN_GUTTER
    : FLASHCARD_WABI_SCREEN_GUTTER
}

export function flashcardWabiCardMaxWidth(screenWidth: number): number {
  return screenWidth >= TABLET_MIN_WIDTH
    ? FLASHCARD_WABI_TABLET_MAX_WIDTH
    : FLASHCARD_WABI_MAX_WIDTH
}

export function flashcardWabiCardWidth(screenWidth: number): number {
  const gutter = flashcardWabiScreenGutter(screenWidth)
  const max = flashcardWabiCardMaxWidth(screenWidth)
  return Math.min(max, screenWidth - gutter * 2 - FLASHCARD_WABI_STACK_BLEED * 2)
}

export function flashcardWabiCardHeight(screenWidth: number): number {
  return screenWidth >= TABLET_MIN_WIDTH
    ? FLASHCARD_WABI_TABLET_CARD_HEIGHT
    : FLASHCARD_WABI_CARD_HEIGHT
}

export function flashcardWabiStageHeight(screenWidth: number): number {
  return screenWidth >= TABLET_MIN_WIDTH
    ? FLASHCARD_WABI_TABLET_STAGE_HEIGHT
    : FLASHCARD_WABI_STAGE_HEIGHT
}

/** Soft immersive wash behind the study stage (light + dark). */
export function flashcardStudyCanvasGradient(isDark: boolean): readonly [string, string, string] {
  if (isDark) {
    return ["#0B1220", "#101A2E", "#141028"] as const
  }
  return ["#F7FAFF", "#EEF5FF", "#F5F0FF"] as const
}

export function flashcardStudyContentMaxWidth(screenWidth: number): number {
  if (screenWidth < TABLET_MIN_WIDTH) return screenWidth
  return Math.min(640, flashcardWabiCardWidth(screenWidth) + 80)
}
export const FLASHCARD_WABI_STACK = {
  cardMinHeight: FLASHCARD_WABI_CARD_HEIGHT,
  backLeftRotate: "-11deg",
  backRightRotate: "10deg",
  backLeftOffset: { x: -24, y: 16 },
  backRightOffset: { x: 22, y: 20 },
} as const

export const FLASHCARD_WABI_SPRING = {
  cardEnter: { damping: 16, stiffness: 210, mass: 0.88 },
  cardExit: { damping: 20, stiffness: 260, mass: 0.8 },
  flip: { damping: 24, stiffness: 150, mass: 0.95, overshootClamping: true },
  knownExit: { duration: 580 },
  stack: { damping: 18, stiffness: 190, mass: 0.95 },
  fan: { damping: 17, stiffness: 200, mass: 0.9 },
} as const
