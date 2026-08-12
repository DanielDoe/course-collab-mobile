import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { FACULTY_COLLAB_COLOR } from "../../lib/faculty-collab-theme"
import { NativeCountBadge } from "../faculty/faculty-shared"
import { HorizontalScrollWithHints } from "./HorizontalScrollWithHints"

export type CleanPillTabItem<T extends string> = {
  id: T
  label: string
  icon?: keyof typeof Ionicons.glyphMap
  count?: number
}

type Props<T extends string> = {
  tabs: CleanPillTabItem<T>[]
  value: T
  onChange: (value: T) => void
  scrollable?: boolean
  theme?: "faculty" | "student"
  embedded?: boolean
}

const TAB_SHADOW = Platform.select({
  ios: {
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  android: { elevation: 2 },
  default: {},
})

/** Revolut-style tabs — white active capsule; inactive icon + label, no chrome. */
export function CleanPillTabBar<T extends string>({
  tabs,
  value,
  onChange,
  scrollable = true,
  theme = "faculty",
  embedded = false,
}: Props<T>) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const isStudent = theme === "student"

  const activeSurface = tokens.isDark ? native.tertiaryGrouped : "#FFFFFF"
  const inactiveLabel = isStudent ? SN.tertiaryLabel : native.tertiaryLabel
  const activeLabel = isStudent ? SN.label : native.label
  const activeIcon = isStudent ? SN.accent : FACULTY_COLLAB_COLOR.tabActive
  const inactiveIcon = isStudent ? SN.tertiaryLabel : native.tertiaryLabel

  const content = tabs.map((tab) => {
    const active = tab.id === value
    const hasIcon = Boolean(tab.icon)

    return (
      <Pressable
        key={tab.id}
        style={[styles.hit, scrollable && styles.hitScroll]}
        onPress={() => onChange(tab.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        <View
          style={[
            styles.tabInner,
            active
              ? [styles.tabActive, { backgroundColor: activeSurface }, TAB_SHADOW]
              : styles.tabInactive,
          ]}
        >
          {hasIcon ? (
            <Ionicons
              name={tab.icon!}
              size={active ? 18 : 17}
              color={active ? activeIcon : inactiveIcon}
            />
          ) : null}
          <Text
            style={[
              type.bodyEmphasis,
              styles.label,
              active
                ? [styles.labelActive, { color: activeLabel }]
                : { color: inactiveLabel, fontWeight: "500" },
            ]}
            numberOfLines={1}
          >
            {tab.label}
          </Text>
          {tab.count != null && tab.count > 0 ? (
            <NativeCountBadge count={tab.count} variant="compact" />
          ) : null}
        </View>
      </Pressable>
    )
  })

  const bar = scrollable ? (
    <HorizontalScrollWithHints showHints={false} contentContainerStyle={styles.scrollRow}>
      {content}
    </HorizontalScrollWithHints>
  ) : (
    <View style={styles.row}>{content}</View>
  )

  return (
    <View
      style={[
        embedded ? styles.wrapEmbedded : styles.wrap,
        { backgroundColor: native.groupedBackground },
      ]}
      accessibilityRole="tablist"
    >
      {bar}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  wrapEmbedded: {
    paddingBottom: 4,
  },
  scrollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingVertical: 4,
    paddingRight: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    paddingVertical: 4,
  },
  hit: {
    flexGrow: 0,
    flexShrink: 0,
  },
  hitScroll: {
    flexGrow: 0,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tabInactive: {
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  tabActive: {
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
  labelActive: {
    fontWeight: "700",
    letterSpacing: -0.25,
  },
})
