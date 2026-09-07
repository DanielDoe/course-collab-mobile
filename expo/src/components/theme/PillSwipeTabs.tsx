import { useEffect, useRef, useState, type ReactNode } from "react"
import { LayoutChangeEvent, StyleSheet, View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import {
  MobbinPillSegmentControl,
  type MobbinPillSegmentOption,
} from "./MobbinPillSegmentControl"
import { spring, useAppReducedMotion } from "../../lib/motion"

const PAGE_SPRING = spring.pill

type Props<T extends string> = {
  options: MobbinPillSegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  pages: ReactNode[]
  pagePaddingHorizontal?: number
  /** Reserve space on the right of the segment bar (e.g. for a floating action). */
  segmentInsetRight?: number
  /** Horizontally scroll the segment bar when options exceed the viewport. */
  scrollable?: boolean
  /** Segments visible at once when scrollable (default 3). */
  visibleSegmentCount?: number
}

export function PillSwipeTabs<T extends string>({
  options,
  value,
  onChange,
  pages,
  pagePaddingHorizontal = 0,
  segmentInsetRight = 0,
  scrollable = false,
  visibleSegmentCount = 3,
}: Props<T>) {
  const [layoutWidth, setLayoutWidth] = useState(0)
  const pageWidth = layoutWidth
  const scrollX = useSharedValue(0)
  const dragStartX = useSharedValue(0)
  const translateX = useSharedValue(0)
  const skipActiveSyncRef = useRef(false)
  const reduceMotion = useAppReducedMotion()

  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )

  const pageCount = options.length

  function commitIndex(index: number) {
    const next = options[index]?.id
    if (next != null) onChange(next)
  }

  function animateToIndex(index: number) {
    if (pageWidth <= 0) return
    const clamped = Math.max(0, Math.min(pageCount - 1, index))
    const x = clamped * pageWidth
    if (reduceMotion) {
      scrollX.value = x
      translateX.value = -x
      return
    }
    scrollX.value = withSpring(x, PAGE_SPRING)
    translateX.value = withSpring(-x, PAGE_SPRING)
  }

  useEffect(() => {
    if (pageWidth <= 0) return
    if (skipActiveSyncRef.current) {
      skipActiveSyncRef.current = false
      return
    }
    const x = activeIndex * pageWidth
    scrollX.value = x
    translateX.value = -x
  }, [activeIndex, pageWidth, scrollX, translateX])

  function onSegmentChange(next: T) {
    const index = options.findIndex((option) => option.id === next)
    if (index < 0) return
    skipActiveSyncRef.current = true
    onChange(next)
    animateToIndex(index)
  }

  function onRootLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width
    if (width > 0 && width !== layoutWidth) setLayoutWidth(width)
  }

  const nativeScroll = Gesture.Native()

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .simultaneousWithExternalGesture(nativeScroll)
    .onBegin(() => {
      dragStartX.value = translateX.value
    })
    .onUpdate((event) => {
      if (pageWidth <= 0) return
      const maxX = 0
      const minX = -(pageCount - 1) * pageWidth
      const next = dragStartX.value + event.translationX
      const clamped = Math.min(maxX, Math.max(minX, next))
      translateX.value = clamped
      scrollX.value = -clamped
    })
    .onEnd(() => {
      if (pageWidth <= 0) return
      const index = Math.round(-translateX.value / pageWidth)
      const clamped = Math.max(0, Math.min(pageCount - 1, index))
      const x = clamped * pageWidth
      if (reduceMotion) {
        scrollX.value = x
        translateX.value = -x
      } else {
        scrollX.value = withSpring(x, PAGE_SPRING)
        translateX.value = withSpring(-x, PAGE_SPRING)
      }
      runOnJS(commitIndex)(clamped)
    })

  const trackStyle = useAnimatedStyle(() => ({
    width: pageWidth * pageCount,
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <View style={styles.root} onLayout={onRootLayout}>
      <MobbinPillSegmentControl
        options={options}
        value={value}
        onChange={onSegmentChange}
        scrollX={scrollX}
        pageWidth={pageWidth}
        insetRight={segmentInsetRight}
        scrollable={scrollable}
        visibleCount={visibleSegmentCount}
      />

      <GestureDetector gesture={Gesture.Simultaneous(panGesture, nativeScroll)}>
        <Animated.View style={styles.pager}>
          {pageWidth > 0 ? (
            <Animated.View style={[styles.track, trackStyle]}>
              {pages.map((page, index) => (
                <View
                  key={options[index]?.id ?? `page-${index}`}
                  style={[styles.page, { width: pageWidth, paddingHorizontal: pagePaddingHorizontal }]}
                >
                  <GestureDetector gesture={nativeScroll}>
                    <View style={styles.pageBody}>{page}</View>
                  </GestureDetector>
                </View>
              ))}
            </Animated.View>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  pager: {
    flex: 1,
    overflow: "hidden",
  },
  track: {
    flexDirection: "row",
    flex: 1,
  },
  page: {
    flex: 1,
    minHeight: 0,
  },
  pageBody: {
    flex: 1,
    minHeight: 0,
  },
})
