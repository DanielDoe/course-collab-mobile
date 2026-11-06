import { useEffect, useRef } from "react"
import { LayoutChangeEvent } from "react-native"
import { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"
import { useAppReducedMotion } from "./reducedMotion"
import { spring } from "./springs"

type TabLayout = { x: number; width: number }

type Options = {
  springPreset?: (typeof spring)[keyof typeof spring]
}

/** Gliding capsule indicator for open pill tab bars (CleanPillTabBar). */
export function usePillTabIndicator(activeIndex: number, options?: Options) {
  const reduceMotion = useAppReducedMotion()
  const preset = options?.springPreset ?? spring.pill
  const indicatorX = useSharedValue(0)
  const indicatorW = useSharedValue(0)
  const layoutsRef = useRef<TabLayout[]>([])

  function snapTo(index: number) {
    const layout = layoutsRef.current[index]
    if (!layout || layout.width <= 0) return
    if (reduceMotion) {
      indicatorX.value = layout.x
      indicatorW.value = layout.width
      return
    }
    indicatorX.value = withSpring(layout.x, preset)
    indicatorW.value = withSpring(layout.width, preset)
  }

  useEffect(() => {
    snapTo(activeIndex)
  }, [activeIndex, reduceMotion])

  function onTabLayout(index: number) {
    return (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout
      const prev = layoutsRef.current[index]
      if (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.width - width) < 0.5) return
      layoutsRef.current[index] = { x, width }
      if (index === activeIndex) snapTo(index)
    }
  }

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorW.value,
    transform: [{ translateX: indicatorX.value }],
  }))

  return { indicatorStyle, onTabLayout }
}
