import { useEffect, useMemo, useRef, useState } from "react"
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import Animated, {
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { Ionicons, type IoniconName } from "@/components/icons/AppIcon"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"

export type MobbinPillSegmentOption<T extends string> = {
  id: T
  label: string
  icon?: IoniconName
}

type Props<T extends string> = {
  options: MobbinPillSegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** When set with pageWidth, the pill thumb tracks horizontal pager drag in real time. */
  scrollX?: SharedValue<number>
  pageWidth?: number
  /** Extra right padding on the segment track row (keeps pill clear of overlay buttons). */
  insetRight?: number
  /** When true, segments scroll horizontally (~visibleCount fit in the viewport). */
  scrollable?: boolean
  /** Segments visible at once when scrollable (default 3). */
  visibleCount?: number
}

const TRACK_PADDING = 4
const THUMB_SPRING = { damping: 20, stiffness: 260, mass: 0.85 }
const ICON_SIZE = 16
const ICON_SIZE_COMPACT = 14

function thumbShadow(accent: string, isDark: boolean) {
  return Platform.select({
    ios: {
      shadowColor: accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.28 : 0.16,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  })
}

function segmentFocus(index: number, scrollX: SharedValue<number> | undefined, pageWidth: number) {
  "worklet"
  if (scrollX && pageWidth > 0) {
    return Math.max(0, 1 - Math.abs(scrollX.value / pageWidth - index))
  }
  return 0
}

function SegmentIcon({
  name,
  index,
  active,
  scrollX,
  pageWidth,
  activeColor,
  inactiveColor,
  compact,
}: {
  name: IoniconName
  index: number
  active: boolean
  scrollX?: SharedValue<number>
  pageWidth?: number
  activeColor: string
  inactiveColor: string
  compact?: boolean
}) {
  const size = compact ? ICON_SIZE_COMPACT : ICON_SIZE
  const inactiveOpacity = useAnimatedStyle(() => {
    if (scrollX && pageWidth && pageWidth > 0) {
      return { opacity: 1 - segmentFocus(index, scrollX, pageWidth) }
    }
    return { opacity: active ? 0 : 1 }
  })

  const activeOpacity = useAnimatedStyle(() => {
    if (scrollX && pageWidth && pageWidth > 0) {
      return { opacity: segmentFocus(index, scrollX, pageWidth) }
    }
    return { opacity: active ? 1 : 0 }
  })

  return (
    <View style={[styles.iconSlot, compact && styles.iconSlotCompact]}>
      <Animated.View style={inactiveOpacity}>
        <Ionicons name={name} size={size} color={inactiveColor} />
      </Animated.View>
      <Animated.View style={[styles.iconOverlay, activeOpacity]} pointerEvents="none">
        <Ionicons name={name} size={size} color={activeColor} />
      </Animated.View>
    </View>
  )
}

function SegmentLabel({
  label,
  index,
  active,
  scrollX,
  pageWidth,
  activeColor,
  inactiveColor,
  compact,
}: {
  label: string
  index: number
  active: boolean
  scrollX?: SharedValue<number>
  pageWidth?: number
  activeColor: string
  inactiveColor: string
  compact?: boolean
}) {
  const progress = useSharedValue(active ? 1 : 0)

  useEffect(() => {
    if (scrollX && pageWidth && pageWidth > 0) return
    progress.value = withSpring(active ? 1 : 0, THUMB_SPRING)
  }, [active, pageWidth, progress, scrollX])

  const labelStyle = useAnimatedStyle(() => {
    if (scrollX && pageWidth && pageWidth > 0) {
      const t = segmentFocus(index, scrollX, pageWidth)
      return { color: interpolateColor(t, [0, 1], [inactiveColor, activeColor]) }
    }
    return { color: interpolateColor(progress.value, [0, 1], [inactiveColor, activeColor]) }
  })

  return (
    <Animated.Text
      style={[
        styles.label,
        compact && styles.labelCompact,
        labelStyle,
        active ? styles.labelActive : styles.labelInactive,
      ]}
      numberOfLines={1}
    >
      {label}
    </Animated.Text>
  )
}

/** Pill segmented control with optional icons and theme-accent styling. */
export function MobbinPillSegmentControl<T extends string>({
  options,
  value,
  onChange,
  scrollX,
  pageWidth = 0,
  insetRight = 0,
  scrollable = false,
  visibleCount = 3,
}: Props<T>) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()

  const scrollRef = useRef<ScrollView>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [trackWidth, setTrackWidth] = useState(0)
  const [tabScrollX, setTabScrollX] = useState(0)
  const thumbX = useSharedValue(0)
  const segmentWidthShared = useSharedValue(0)

  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )

  const segmentWidth = scrollable
    ? viewportWidth > 0
      ? (viewportWidth - TRACK_PADDING * 2) / Math.max(visibleCount, 1)
      : 0
    : trackWidth > 0
      ? (trackWidth - TRACK_PADDING * 2) / Math.max(options.length, 1)
      : 0

  const scrollTrackWidth =
    scrollable && segmentWidth > 0 ? segmentWidth * options.length + TRACK_PADDING * 2 : trackWidth

  const compact = options.length >= 4

  useEffect(() => {
    segmentWidthShared.value = segmentWidth
  }, [segmentWidth, segmentWidthShared])

  useEffect(() => {
    if (scrollX && pageWidth > 0) return
    if (segmentWidth <= 0) return
    thumbX.value = withSpring(activeIndex * segmentWidth, THUMB_SPRING)
  }, [activeIndex, pageWidth, scrollX, segmentWidth, thumbX])

  const palette = useMemo(() => {
    const accent = tokens.accent
    if (tokens.isDark) {
      return {
        trackBg: tokens.accentSoft,
        thumbBg: native.secondaryGrouped,
        thumbBorder: tokens.accentBorder,
        activeIcon: accent,
        activeLabel: native.label,
        inactiveLabel: native.secondaryLabel,
        ripple: hexToRgba(accent, 0.12),
      }
    }

    return {
      trackBg: tokens.accentSoft,
      thumbBg: "#FFFFFF",
      thumbBorder: tokens.accentBorder,
      activeIcon: accent,
      activeLabel: "#1C1C1E",
      inactiveLabel: "#636366",
      ripple: hexToRgba(accent, 0.1),
    }
  }, [native, tokens])

  const thumbStyle = useAnimatedStyle(() => {
    const segW = segmentWidthShared.value
    if (scrollX && pageWidth > 0 && segW > 0) {
      const progress = scrollX.value / pageWidth
      return { transform: [{ translateX: progress * segW }] }
    }
    return { transform: [{ translateX: thumbX.value }] }
  })

  function onTrackLayout(event: LayoutChangeEvent) {
    if (scrollable) return
    const width = event.nativeEvent.layout.width
    if (width > 0 && width !== trackWidth) setTrackWidth(width)
  }

  function onViewportLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width
    if (width > 0 && width !== viewportWidth) setViewportWidth(width)
  }

  useEffect(() => {
    if (!scrollable || segmentWidth <= 0 || viewportWidth <= 0) return
    const maxScroll = Math.max(0, scrollTrackWidth - viewportWidth)
    const tabLeft = TRACK_PADDING + activeIndex * segmentWidth
    const tabRight = tabLeft + segmentWidth
    let target = tabScrollX
    if (tabLeft < tabScrollX + TRACK_PADDING) {
      target = Math.max(0, tabLeft - TRACK_PADDING)
    } else if (tabRight > tabScrollX + viewportWidth - TRACK_PADDING) {
      target = tabRight - viewportWidth + TRACK_PADDING
    }
    target = Math.max(0, Math.min(target, maxScroll))
    if (Math.abs(target - tabScrollX) > 1) {
      scrollRef.current?.scrollTo({ x: target, animated: true })
    }
  }, [activeIndex, scrollable, scrollTrackWidth, segmentWidth, tabScrollX, viewportWidth])

  const track = (
    <View
      style={[
        styles.track,
        scrollable && scrollTrackWidth > 0 && { width: scrollTrackWidth },
        { backgroundColor: palette.trackBg },
      ]}
      onLayout={onTrackLayout}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: segmentWidth,
              backgroundColor: palette.thumbBg,
              borderColor: palette.thumbBorder,
            },
            thumbShadow(tokens.accent, tokens.isDark),
            thumbStyle,
          ]}
        />
      ) : null}

      {options.map((option, index) => {
        const active = option.id === value
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [
              styles.segment,
              scrollable && segmentWidth > 0 && { width: segmentWidth, flex: 0 },
              pressed && !active && styles.segmentPressed,
            ]}
            onPress={() => onChange(option.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            android_ripple={{ color: palette.ripple, borderless: false }}
          >
            <View style={[styles.segmentInner, compact && styles.segmentInnerCompact]}>
              {option.icon ? (
                <SegmentIcon
                  name={option.icon}
                  index={index}
                  active={active}
                  scrollX={scrollX}
                  pageWidth={pageWidth}
                  activeColor={palette.activeIcon}
                  inactiveColor={palette.inactiveLabel}
                  compact={compact}
                />
              ) : null}
              <SegmentLabel
                label={option.label}
                index={index}
                active={active}
                scrollX={scrollX}
                pageWidth={pageWidth}
                activeColor={palette.activeLabel}
                inactiveColor={palette.inactiveLabel}
                compact={compact}
              />
            </View>
          </Pressable>
        )
      })}
    </View>
  )

  return (
    <View
      style={[styles.wrap, insetRight > 0 && { paddingRight: 16 + insetRight }]}
      accessibilityRole="tablist"
      onLayout={scrollable ? onViewportLayout : undefined}
    >
      {scrollable ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(event) => setTabScrollX(event.nativeEvent.contentOffset.x)}
        >
          {track}
        </ScrollView>
      ) : (
        track
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  track: {
    flexDirection: "row",
    position: "relative",
    borderRadius: 999,
    padding: TRACK_PADDING,
    minHeight: 46,
  },
  thumb: {
    position: "absolute",
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  segmentInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    maxWidth: "100%",
  },
  segmentInnerCompact: {
    gap: 4,
  },
  segmentPressed: {
    opacity: 0.75,
  },
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSlotCompact: {
    width: ICON_SIZE_COMPACT,
    height: ICON_SIZE_COMPACT,
  },
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.15,
    flexShrink: 1,
  },
  labelCompact: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  labelActive: {
    fontWeight: "600",
  },
  labelInactive: {
    fontWeight: "500",
  },
})
