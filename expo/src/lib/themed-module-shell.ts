import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { NATIVE } from "../constants/faculty-native-theme"
import { useAppThemeTokens, useShellChrome, useThemedNative } from "../context/AppearanceProvider"
import { useNativeType } from "./themed-module-theme"

/** Shared list-screen layout colors — derived from the active appearance theme. */
function createModuleListStyles(
  native: ReturnType<typeof useThemedNative>,
  tokens: ReturnType<typeof useAppThemeTokens>,
  type: ReturnType<typeof useNativeType>,
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: native.groupedBackground },
    scroll: { flex: 1, backgroundColor: native.groupedBackground },
    content: { padding: 16, gap: 12 },
    center: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: native.groupedBackground,
    },
    card: {
      backgroundColor: native.secondaryGrouped,
      borderRadius: NATIVE.sectionRadius,
      padding: 16,
      gap: 12,
      ...tokens.cardShadow,
    },
    cardPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
    cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: tokens.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardCopy: { flex: 1, minWidth: 0, gap: 4 },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    cardTitle: { ...type.bodyEmphasis, fontSize: 18, letterSpacing: -0.2, color: native.label, minWidth: 0 },
    cardDates: { ...type.caption, fontWeight: "600", color: native.secondaryLabel },
    cardStats: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { ...type.caption, fontWeight: "600", color: native.secondaryLabel },
    cardChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: native.fill,
    },
    chipText: { ...type.caption, fontWeight: "700", color: native.label },
    moreChip: { ...type.caption, fontWeight: "700", color: native.secondaryLabel },
    errorBox: {
      flexDirection: "row",
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: `${tokens.danger}14`,
    },
    errorText: { flex: 1, color: tokens.danger, fontSize: 14, lineHeight: 20 },
    filterRow: { paddingHorizontal: 16, gap: 8 },
    filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    filterChip: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: native.secondaryGrouped,
    },
    filterChipActive: { backgroundColor: native.fill },
    filterChipText: { ...type.caption, fontWeight: "600", color: native.secondaryLabel },
    filterChipTextActive: { color: native.label },
    resultsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      gap: 8,
    },
    resultsText: { flex: 1, ...type.caption, lineHeight: 18, color: native.secondaryLabel },
    clearBtn: { fontSize: 15, fontWeight: "400", color: native.tint },
    footerBar: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: native.separator,
      backgroundColor: native.secondaryGrouped,
    },
    draftBtn: {
      flex: 1,
      backgroundColor: native.fill,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    publishBtn: { flex: 1, backgroundColor: tokens.accent },
    footerBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: NATIVE.sectionRadius,
    },
    footerBtnText: { ...type.bodyEmphasis, color: native.label },
    footerBtnTextPrimary: { ...type.bodyEmphasis, color: "#ffffff" },
    sectionCard: {
      backgroundColor: native.secondaryGrouped,
      borderRadius: NATIVE.sectionRadius,
      overflow: "hidden",
      ...tokens.cardShadow,
    },
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: NATIVE.rowMinHeight,
    },
    sectionRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: native.separator,
    },
    sectionRowTitle: { ...type.bodyEmphasis, flex: 1, color: native.label },
    sectionRowSub: { ...type.caption, color: native.secondaryLabel },
    listSummary: { ...type.caption, paddingHorizontal: 16, color: native.secondaryLabel },
    insetList: {
      backgroundColor: native.secondaryGrouped,
      borderRadius: NATIVE.sectionRadius,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: native.separator,
    },
    menuGroup: {
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
    },
  })
}

/**
 * Unified module theme for student, faculty, guest, and summer flows.
 * Prefer this over static NATIVE / FACULTY_BRAND in screen components.
 */
export function useModuleTheme() {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const chrome = useShellChrome()
  const type = useNativeType()

  const styles = useMemo(
    () => createModuleListStyles(native, tokens, type),
    [native, tokens, type],
  )

  return useMemo(
    () => ({
      tokens,
      native,
      chrome,
      type,
      styles,
      isDark: tokens.isDark,
      accent: tokens.accent,
      accentSoft: tokens.accentSoft,
      accentDark: tokens.accentDark,
      border: tokens.border,
      danger: tokens.danger,
      warning: tokens.warning,
      success: tokens.success,
      pageBg: native.groupedBackground,
      surface: native.secondaryGrouped,
      cardShadow: tokens.cardShadow,
    }),
    [tokens, native, chrome, type, styles],
  )
}

/** @deprecated Use useModuleTheme().styles — kept for faculty imports. */
export function useFacultyModuleStyles() {
  return useModuleTheme().styles
}
