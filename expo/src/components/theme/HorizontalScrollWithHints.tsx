import { useCallback, useRef, useState, type ReactNode, type RefObject } from "react"
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"

const SCROLL_STEP = 148
const EDGE_EPSILON = 4

type ScrollMetrics = {
  scrollX: number
  layoutWidth: number
  contentWidth: number
}

type Props = {
  children: ReactNode
  /** When false, renders a plain horizontal ScrollView with no arrows. */
  showHints?: boolean
  /** Width reserved at each screen edge for chevrons (matches page padding). */
  edgeGutter?: number
  contentContainerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
  /** Optional ref for programmatic scroll (e.g. keep active tab visible). */
  scrollRef?: RefObject<ScrollView | null>
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  onLayout?: (event: LayoutChangeEvent) => void
}

/**
 * Horizontal scroll row with edge chevrons in the page-padding gutters.
 * Chevrons never sit on tab labels — they occupy fixed left/right inset columns.
 */
export function HorizontalScrollWithHints({
  children,
  showHints = true,
  edgeGutter = NATIVE.pagePadding,
  contentContainerStyle,
  style,
  scrollRef: scrollRefProp,
  onScroll,
  onLayout,
}: Props) {
  const scrollRefInternal = useRef<ScrollView>(null)
  const scrollRef = scrollRefProp ?? scrollRefInternal
  const native = useThemedNative()
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    scrollX: 0,
    layoutWidth: 0,
    contentWidth: 0,
  })

  const overflow = metrics.contentWidth > metrics.layoutWidth + EDGE_EPSILON
  const hintsActive = showHints && overflow
  const canScrollLeft = hintsActive && metrics.scrollX > EDGE_EPSILON
  const canScrollRight =
    hintsActive && metrics.scrollX + metrics.layoutWidth < metrics.contentWidth - EDGE_EPSILON

  if (!showHints) {
    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        style={[styles.wrap, style]}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        directionalLockEnabled
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={onLayout}
      >
        {children}
      </ScrollView>
    )
  }

  const arrowBg = native.fill
  const arrowBorder = native.separator
  const arrowColor = native.secondaryLabel

  const updateMetrics = useCallback((next: Partial<ScrollMetrics>) => {
    setMetrics((prev) => {
      const merged = { ...prev, ...next }
      const overflowNow = merged.contentWidth > merged.layoutWidth + EDGE_EPSILON
      const overflowWas = prev.contentWidth > prev.layoutWidth + EDGE_EPSILON
      const leftNow = overflowNow && merged.scrollX > EDGE_EPSILON
      const leftWas = overflowWas && prev.scrollX > EDGE_EPSILON
      const rightNow =
        overflowNow && merged.scrollX + merged.layoutWidth < merged.contentWidth - EDGE_EPSILON
      const rightWas =
        overflowWas && prev.scrollX + prev.layoutWidth < prev.contentWidth - EDGE_EPSILON
      if (
        merged.layoutWidth === prev.layoutWidth &&
        merged.contentWidth === prev.contentWidth &&
        leftNow === leftWas &&
        rightNow === rightWas
      ) {
        return prev
      }
      return merged
    })
  }, [])

  const onContentSizeChange = useCallback(
    (width: number) => {
      updateMetrics({ contentWidth: width })
    },
    [updateMetrics],
  )

  const onScrollLayout = useCallback(
    (event: LayoutChangeEvent) => {
      updateMetrics({ layoutWidth: event.nativeEvent.layout.width })
    },
    [updateMetrics],
  )

  const syncScrollMetrics = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
      updateMetrics({
        scrollX: contentOffset.x,
        layoutWidth: layoutMeasurement.width,
        contentWidth: contentSize.width,
      })
    },
    [updateMetrics],
  )

  const scrollBy = useCallback(
    (delta: number) => {
      const maxOffset = Math.max(0, metrics.contentWidth - metrics.layoutWidth)
      const next = Math.max(0, Math.min(metrics.scrollX + delta, maxOffset))
      scrollRef.current?.scrollTo({ x: next, animated: true })
    },
    [metrics.contentWidth, metrics.layoutWidth, metrics.scrollX],
  )

  const renderEdgeHint = (direction: "left" | "right", visible: boolean) => {
    if (!hintsActive) return null
    return (
      <View style={[styles.edgeGutter, { width: edgeGutter }]}>
        {visible ? (
          <Pressable
            style={({ pressed }) => [
              styles.arrowHit,
              { width: edgeGutter },
              pressed && styles.arrowPressed,
            ]}
            onPress={() => scrollBy(direction === "left" ? -SCROLL_STEP : SCROLL_STEP)}
            accessibilityRole="button"
            accessibilityLabel={direction === "left" ? "Show previous tabs" : "Show more tabs"}
          >
            <View
              style={[
                styles.arrowIcon,
                { backgroundColor: arrowBg, borderColor: arrowBorder },
              ]}
            >
              <Ionicons
                name={direction === "left" ? "chevron-back" : "chevron-forward"}
                size={13}
                color={arrowColor}
              />
            </View>
          </Pressable>
        ) : null}
      </View>
    )
  }

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        {renderEdgeHint("left", canScrollLeft)}

        <ScrollView
          ref={scrollRef}
          horizontal
          style={styles.scroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={contentContainerStyle}
          onLayout={(event) => {
            onScrollLayout(event)
            onLayout?.(event)
          }}
          onContentSizeChange={onContentSizeChange}
          onScroll={(event) => {
            syncScrollMetrics(event)
            onScroll?.(event)
          }}
          onMomentumScrollEnd={syncScrollMetrics}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          directionalLockEnabled
        >
          {children}
        </ScrollView>

        {renderEdgeHint("right", canScrollRight)}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  edgeGutter: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
    minWidth: 0,
  },
  arrowHit: {
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowPressed: { opacity: 0.82 },
})
