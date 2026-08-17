import type { ReactNode } from "react"
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useShellChrome, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useGlassChromeActive } from "./GlassSurface"

/** Dimmed scrim behind action sheets — strong enough for text contrast on glass. */
export const GLASS_SHEET_BACKDROP = "rgba(0, 0, 0, 0.48)"

/** Grab handle for bottom sheets. */
export function GlassSheetHandle() {
  const tokens = useAppThemeTokens()
  return (
    <View style={styles.handleWrap}>
      <View
        style={[
          styles.handle,
          { backgroundColor: tokens.isDark ? "rgba(255,255,255,0.22)" : "rgba(60,60,67,0.28)" },
        ]}
      />
    </View>
  )
}

/** Single unified menu block — rows sit directly on the sheet glass (no nested opaque cards). */
export function GlassMenuList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.list, style]}>{children}</View>
}

/** Visual break between menu groups without a separate card. */
export function GlassMenuSectionGap() {
  return <View style={styles.sectionGap} />
}

type MenuRowProps = {
  icon?: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  destructive?: boolean
  showSeparator?: boolean
  detail?: string
  badgeCount?: number
}

export function GlassMenuRow({
  icon,
  label,
  onPress,
  destructive,
  showSeparator,
  detail,
  badgeCount,
}: MenuRowProps) {
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const glassActive = useGlassChromeActive()
  const pressedBg = glassActive
    ? "rgba(120, 120, 128, 0.16)"
    : native.fill

  const a11yLabel = detail ? `${label}, ${detail}` : label

  if (destructive) {
    return (
      <Pressable
        style={({ pressed }) => [styles.row, styles.rowDestructive, pressed && { backgroundColor: pressedBg }]}
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[type.destructive, styles.rowLabelDanger]}>{label}</Text>
      </Pressable>
    )
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: pressedBg }]}
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
      >
        {icon ? (
          <View style={styles.rowIconWrap}>
            <Ionicons name={icon} size={22} color={chrome.label} />
          </View>
        ) : null}
        <Text style={[type.body, styles.rowLabel, { color: chrome.label }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.rowTrailing}>
          {detail ? (
            <Text style={[type.detail, styles.rowDetail, { color: chrome.secondaryLabel }]} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
          {badgeCount != null && badgeCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: tokens.danger }]}>
              <Text style={styles.badgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={chrome.tertiaryLabel} />
          )}
        </View>
      </Pressable>
      {showSeparator ? <View style={[styles.separator, { backgroundColor: chrome.separator }]} /> : null}
    </>
  )
}

/** Selectable filter row — checkmark on active, rows sit on sheet glass (no nested cards). */
export function GlassFilterOptionRow({
  label,
  active = false,
  onPress,
  showSeparator,
}: {
  label: string
  active?: boolean
  onPress: () => void
  showSeparator?: boolean
}) {
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const glassActive = useGlassChromeActive()
  const pressedBg = glassActive ? "rgba(120, 120, 128, 0.16)" : native.fill

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.filterRow, pressed && { backgroundColor: pressedBg }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
      >
        <Text
          style={[
            type.body,
            styles.filterRowLabel,
            { color: chrome.label },
            active && { color: tokens.accentDark, fontWeight: "600" },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {active ? <Ionicons name="checkmark-circle" size={20} color={tokens.accent} /> : null}
      </Pressable>
      {showSeparator ? <View style={[styles.filterSeparator, { backgroundColor: chrome.separator }]} /> : null}
    </>
  )
}

/** Profile header block — transparent on glass sheets. */
export function GlassSheetProfileHeader({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.profileHeader, style]}>{children}</View>
}

const styles = StyleSheet.create({
  handleWrap: { alignItems: "center", paddingBottom: 8 },
  handle: { width: 36, height: 5, borderRadius: 3 },
  list: {
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionGap: { height: 12 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 12,
  },
  rowIconWrap: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  rowDestructive: { justifyContent: "center", paddingHorizontal: 4 },
  rowLabel: { flex: 1, minWidth: 0, marginRight: 8 },
  rowTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    maxWidth: "46%",
  },
  rowDetail: { flexShrink: 1, textAlign: "right" as const },
  rowLabelDanger: {
    fontWeight: Platform.OS === "ios" ? "600" : "700",
    textAlign: "center",
  },
  filterRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    gap: 12,
  },
  filterRowLabel: { flex: 1, minWidth: 0 },
  filterSeparator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 40,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
})
