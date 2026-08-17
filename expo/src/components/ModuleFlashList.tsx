import { FlashList, type FlashListProps, type FlashListRef } from "@shopify/flash-list"
import { forwardRef } from "react"
import { StyleSheet } from "react-native"

/** Module list defaults — flex fill, keyboard-friendly taps, moderate draw distance. */
export const ModuleFlashList = forwardRef(function ModuleFlashList<T>(
  props: FlashListProps<T>,
  ref: React.Ref<FlashListRef<T>>,
) {
  const { style, drawDistance = 400, refreshControl, contentContainerStyle, ...rest } = props
  const refreshEnabled = Boolean(refreshControl)
  return (
    <FlashList
      ref={ref}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      drawDistance={drawDistance}
      alwaysBounceVertical={refreshEnabled}
      overScrollMode={refreshEnabled ? "always" : undefined}
      {...rest}
      refreshControl={refreshControl}
      contentContainerStyle={[
        refreshEnabled ? styles.refreshContent : undefined,
        contentContainerStyle,
      ]}
      style={[styles.list, style]}
    />
  )
}) as <T>(
  props: FlashListProps<T> & { ref?: React.Ref<FlashListRef<T>> },
) => React.ReactElement

const styles = StyleSheet.create({
  list: { flex: 1 },
  /** Lets short/empty lists overscroll so pull-to-refresh can fire. */
  refreshContent: { flexGrow: 1 },
})
