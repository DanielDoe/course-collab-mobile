import { FlashList, type FlashListProps, type FlashListRef, type ListRenderItemInfo } from "@shopify/flash-list"
import { forwardRef, type ReactElement, type ReactNode } from "react"
import { StyleSheet } from "react-native"
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated"
import { keyboardDismissScrollProps } from "../lib/keyboard-dismiss-scroll-props"
import { durationOrInstant, motion, useAppReducedMotion } from "../lib/motion"

type ModuleFlashListProps<T> = FlashListProps<T> & {
  refreshContentGrow?: boolean
  /** Subtle container resize when list bounds change (filters, tabs). */
  animateLayout?: boolean
  /** Staggered fade-in for rows — pass through renderItem or use wrap helper. */
  animateItems?: boolean
}

/** Wrap a list row for staggered enter when `animateItems` is enabled on the parent list. */
export function ModuleListItemMotion({
  index,
  children,
}: {
  index: number
  children: ReactNode
}) {
  const reduceMotion = useAppReducedMotion()
  if (reduceMotion) return <>{children}</>
  const delay = Math.min(index, 10) * 16
  return (
    <Animated.View entering={FadeIn.duration(durationOrInstant(motion.fast, false)).delay(delay)}>
      {children}
    </Animated.View>
  )
}

/** Module list defaults — flex fill, keyboard-friendly taps, moderate draw distance. */
export const ModuleFlashList = forwardRef(function ModuleFlashList<T>(
  props: ModuleFlashListProps<T>,
  ref: React.Ref<FlashListRef<T>>,
) {
  const reduceMotion = useAppReducedMotion()
  const {
    style,
    drawDistance = 400,
    refreshControl,
    contentContainerStyle,
    refreshContentGrow = true,
    animateLayout = false,
    animateItems = false,
    renderItem,
    ...rest
  } = props

  const wrappedRenderItem =
    animateItems && renderItem
      ? (info: ListRenderItemInfo<T>) => (
          <ModuleListItemMotion index={info.index}>{renderItem(info) as ReactElement}</ModuleListItemMotion>
        )
      : renderItem

  const refreshEnabled = Boolean(refreshControl)
  const list = (
    <FlashList
      ref={ref}
      showsVerticalScrollIndicator={false}
      {...keyboardDismissScrollProps}
      drawDistance={drawDistance}
      alwaysBounceVertical={refreshEnabled}
      overScrollMode={refreshEnabled ? "always" : undefined}
      {...rest}
      renderItem={wrappedRenderItem}
      refreshControl={refreshControl}
      contentContainerStyle={[
        refreshEnabled && refreshContentGrow ? styles.refreshContent : undefined,
        contentContainerStyle,
      ]}
      style={[styles.list, style]}
    />
  )

  if (!animateLayout || reduceMotion) return list

  return (
    <Animated.View
      style={styles.list}
      layout={LinearTransition.duration(durationOrInstant(motion.normal, false))}
    >
      {list}
    </Animated.View>
  )
}) as <T>(
  props: ModuleFlashListProps<T> & { ref?: React.Ref<FlashListRef<T>> },
) => React.ReactElement

const styles = StyleSheet.create({
  list: { flex: 1 },
  /** Lets short/empty lists overscroll so pull-to-refresh can fire. */
  refreshContent: { flexGrow: 1 },
})
