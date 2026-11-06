import { useEffect, useMemo } from "react"
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native"
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { spring, triggerMotionHaptic, useAppReducedMotion, usePillTabIndicator } from "../../lib/motion"
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

function CleanPillTab({
  tab,
  index,
  active,
  activeIcon,
  inactiveIcon,
  activeLabel,
  inactiveLabel,
  onLayout,
  onPress,
}: {
  tab: CleanPillTabItem<string>
  index: number
  active: boolean
  activeIcon: string
  inactiveIcon: string
  activeLabel: string
  inactiveLabel: string
  onLayout: (index: number) => (event: LayoutChangeEvent) => void
  onPress: () => void
}) {
  const type = useNativeType()
  const reduceMotion = useAppReducedMotion()
  const progress = useSharedValue(active ? 1 : 0)
  const hasIcon = Boolean(tab.icon)

  useEffect(() => {
    progress.value = reduceMotion
      ? active
        ? 1
        : 0
      : withSpring(active ? 1 : 0, spring.pill)
  }, [active, progress, reduceMotion])

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.94, 1]) }],
    opacity: interpolate(progress.value, [0, 1], [0.78, 1]),
  }))

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [inactiveLabel, activeLabel]),
  }))

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.88]) }],
  }))

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.88, 1.06]) }],
  }))

  return (
    <Pressable
      style={[styles.hit, styles.hitScroll]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <View
        onLayout={onLayout(index)}
        style={[styles.tabInner, active ? styles.tabActive : styles.tabInactive]}
      >
        <Animated.View style={[styles.tabContent, contentStyle]}>
          {hasIcon ? (
            <View style={styles.iconSlot}>
              <Animated.View style={inactiveIconStyle}>
                <Ionicons name={tab.icon!} size={17} color={inactiveIcon} />
              </Animated.View>
              <Animated.View style={[styles.iconOverlay, activeIconStyle]} pointerEvents="none">
                <Ionicons name={tab.icon!} size={17} color={activeIcon} />
              </Animated.View>
            </View>
          ) : null}
          <Animated.Text
            style={[
              type.bodyEmphasis,
              styles.label,
              active && styles.labelActive,
              labelStyle,
            ]}
            numberOfLines={1}
          >
            {tab.label}
          </Animated.Text>
          {tab.count != null && tab.count > 0 ? (
            <NativeCountBadge count={tab.count} variant="compact" />
          ) : null}
        </Animated.View>
      </View>
    </Pressable>
  )
}

/** Revolut-style tabs — gliding white active capsule; spring cross-fade on icon + label. */
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
  const isStudent = theme === "student"

  const activeSurface = tokens.isDark ? native.tertiaryGrouped : "#FFFFFF"
  const inactiveLabel = isStudent ? SN.tertiaryLabel : native.tertiaryLabel
  const activeLabel = isStudent ? SN.label : native.label
  const activeIcon = isStudent ? SN.accent : FACULTY_COLLAB_COLOR.tabActive
  const inactiveIcon = isStudent ? SN.tertiaryLabel : native.tertiaryLabel

  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === value))
  const { indicatorStyle, onTabLayout } = usePillTabIndicator(activeIndex)

  const content = useMemo(
    () =>
      tabs.map((tab, index) => {
        const active = tab.id === value
        return (
          <CleanPillTab
            key={tab.id}
            tab={tab}
            index={index}
            active={active}
            activeIcon={activeIcon}
            inactiveIcon={inactiveIcon}
            activeLabel={activeLabel}
            inactiveLabel={inactiveLabel}
            onLayout={onTabLayout}
            onPress={() => {
              if (tab.id !== value) triggerMotionHaptic("selection")
              onChange(tab.id)
            }}
          />
        )
      }),
    [
      activeIcon,
      activeLabel,
      inactiveIcon,
      inactiveLabel,
      onChange,
      onTabLayout,
      tabs,
      value,
    ],
  )

  const track = (
    <View style={scrollable ? styles.scrollRowTrack : styles.row}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glidePill,
          { backgroundColor: activeSurface },
          TAB_SHADOW,
          indicatorStyle,
        ]}
      />
      {content}
    </View>
  )

  const bar = scrollable ? (
    <HorizontalScrollWithHints showHints={false} contentContainerStyle={styles.scrollRowOuter}>
      {track}
    </HorizontalScrollWithHints>
  ) : (
    track
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
  scrollRowOuter: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  scrollRowTrack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    position: "relative",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    paddingVertical: 4,
    position: "relative",
  },
  glidePill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 999,
    zIndex: 0,
  },
  hit: {
    flexGrow: 0,
    flexShrink: 0,
    zIndex: 1,
  },
  hitScroll: {
    flexGrow: 0,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
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
  iconSlot: {
    width: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  labelActive: {
    fontWeight: "700",
    letterSpacing: -0.25,
  },
})
