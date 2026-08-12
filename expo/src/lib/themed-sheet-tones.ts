import { useMemo } from "react"
import { useAppThemeTokens, useThemedNative } from "../context/AppearanceProvider"
import { facultySheetSoftAccent, facultySheetToneIcon } from "./faculty-sheet-accents"

export type FacultySheetTone = "teal" | "blue" | "violet" | "amber" | "rose" | "sky" | "slate"

export type SheetToneColors = {
  bg: string
  icon: string
  value: string
  border: string
  soft: string
}

/** Theme-aware sheet accent tones (replaces static white FACULTY_SHEET_TONES). */
export function useFacultySheetTones(): Record<FacultySheetTone, SheetToneColors> {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { isDark } = tokens
  const surface = native.secondaryGrouped
  const label = native.label
  const border = tokens.border

  return useMemo(() => {
    const soft = (tone: FacultySheetTone) => facultySheetSoftAccent(tone, isDark)
    return {
      teal: { bg: surface, icon: facultySheetToneIcon("teal"), value: label, border, soft: soft("teal") },
      blue: { bg: surface, icon: facultySheetToneIcon("blue"), value: label, border, soft: soft("blue") },
      violet: { bg: surface, icon: facultySheetToneIcon("violet"), value: label, border, soft: soft("violet") },
      amber: { bg: surface, icon: facultySheetToneIcon("amber"), value: label, border, soft: soft("amber") },
      rose: { bg: surface, icon: facultySheetToneIcon("rose"), value: label, border, soft: soft("rose") },
      sky: { bg: surface, icon: facultySheetToneIcon("sky"), value: label, border, soft: soft("sky") },
      slate: { bg: surface, icon: facultySheetToneIcon("slate"), value: label, border, soft: soft("slate") },
    }
  }, [surface, label, border, isDark])
}

/** Common sheet / modal surface tokens. */
export function useSheetSurface() {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  return useMemo(
    () => ({
      background: tokens.background,
      surface: tokens.surface,
      grouped: native.secondaryGrouped,
      separator: native.separator,
      label: native.label,
      secondaryLabel: native.secondaryLabel,
      tertiaryLabel: native.tertiaryLabel,
      tint: native.tint,
      cardShadow: tokens.cardShadow,
      isDark: tokens.isDark,
    }),
    [tokens, native],
  )
}
