import { useEffect, useMemo, useRef, useState } from "react"
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
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
  visibleCount: _visibleCount = 3,
}: Props<T>) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()

  const scrollRef = useRef<ScrollView>(null)
  const tabScrollXRef = useRef(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [trackWidth, setTrackWidth] = useState(0)
  const thumbX = useSharedValue(0)
  const thumbW = useSharedValue(0)
  const segmentWidthShared = useSharedValue(0)
  const layoutsShared = useSharedValue<Array<{ x: number; width: number }>>([])

  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )

  const segmentWidth =
    !scrollable && trackWidth > 0
      ? (trackWidth - TRACK_PADDING * 2) / Math.max(options.length, 1)
      : 0

  const compact = options.length >= 4
  const dense = !scrollable && options.length >= 5

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
    const items = layoutsShared.value
    if (scrollable && scrollX && pageWidth > 0 && items.length > 0) {
      const progress = Math.max(0, Math.min(items.length - 1, scrollX.value / pageWidth))
      const i = Math.floor(progress)
      const t = progress - i
      const a = items[i]
      const b = items[Math.min(i + 1, items.length - 1)]
      if (!a) return { opacity: 0 }
      const x = a.x + ((b?.x ?? a.x) - a.x) * t
      const w = a.width + ((b?.width ?? a.width) - a.width) * t
      return { width: w, transform: [{ translateX: x - TRACK_PADDING }] }
    }
    if (scrollable && thumbW.value > 0) {
      return { width: thumbW.value, transform: [{ translateX: thumbX.value - TRACK_PADDING }] }
    }
    const segW = segmentWidthShared.value
    if (scrollX && pageWidth > 0 && segW > 0) {
      return { transform: [{ translateX: (scrollX.value / pageWidth) * segW }] }
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

  const tabLayoutsRef = useRef<Array<{ x: number; width: number }>>([])

  function onSegmentLayout(index: number, event: LayoutChangeEvent) {
    const { x, width } = event.nativeEvent.layout
    const prev = tabLayoutsRef.current[index]
    if (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.width - width) < 0.5) return
    const next = tabLayoutsRef.current.slice()
    next[index] = { x, width }
    tabLayoutsRef.current = next
    layoutsShared.value = next
    if (index === activeIndex && width > 0) {
      thumbX.value = x
      thumbW.value = width
    }
  }

  useEffect(() => {
    if (!scrollable || viewportWidth <= 0) return
    const layout = tabLayoutsRef.current[activeIndex]
    if (!layout) return
    const current = tabScrollXRef.current
    const maxScroll = Math.max(0, (tabLayoutsRef.current.at(-1)?.x ?? 0) + (tabLayoutsRef.current.at(-1)?.width ?? 0) - viewportWidth + TRACK_PADDING)
    let target = current
    if (layout.x < current + TRACK_PADDING) {
      target = Math.max(0, layout.x - TRACK_PADDING)
    } else if (layout.x + layout.width > current + viewportWidth - TRACK_PADDING) {
      target = layout.x + layout.width - viewportWidth + TRACK_PADDING
    }
    target = Math.max(0, Math.min(target, maxScroll))
    if (Math.abs(target - current) > 2) {
      scrollRef.current?.scrollTo({ x: target, animated: true })
    }
  }, [activeIndex, scrollable, viewportWidth])

  const track = (
    <View
      style={[styles.track, { backgroundColor: palette.trackBg }]}
      onLayout={onTrackLayout}
    >
      {(!scrollable && segmentWidth > 0) || scrollable ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: scrollable ? undefined : segmentWidth,
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
              scrollable && styles.segmentFit,
              dense && styles.segmentDense,
              pressed && !active && styles.segmentPressed,
            ]}
            onPress={() => onChange(option.id)}
            onLayout={(event) => onSegmentLayout(index, event)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            android_ripple={{ color: palette.ripple, borderless: false }}
          >
            <View style={[styles.segmentInner, compact && styles.segmentInnerCompact, dense && styles.segmentInnerDense]}>
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
    >
      {scrollable ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          directionalLockEnabled
          decelerationRate="fast"
          scrollEventThrottle={16}
          onLayout={onViewportLayout}
          onScroll={(event) => {
            tabScrollXRef.current = event.nativeEvent.contentOffset.x
          }}
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
  scrollContent: {
    paddingHorizontal: 2,
  },
  scroll: {
    width: "100%",
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
  segmentFit: {
    flex: 0,
    flexGrow: 0,
    paddingHorizontal: 16,
    minWidth: 92,
  },
  segmentDense: {
    paddingHorizontal: 4,
    minHeight: 36,
  },
  segmentInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    maxWidth: "100%",
    paddingHorizontal: 2,
  },
  segmentInnerCompact: {
    gap: 4,
  },
  segmentInnerDense: {
    gap: 2,
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
