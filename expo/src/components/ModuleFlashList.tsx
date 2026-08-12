import { FlashList, type FlashListProps, type FlashListRef } from "@shopify/flash-list"
import { forwardRef } from "react"
import { StyleSheet } from "react-native"

/** Module list defaults — flex fill, keyboard-friendly taps, moderate draw distance. */
export const ModuleFlashList = forwardRef(function ModuleFlashList<T>(
  props: FlashListProps<T>,
  ref: React.Ref<FlashListRef<T>>,
) {
  const { style, drawDistance = 400, ...rest } = props
  return (
    <FlashList
      ref={ref}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      drawDistance={drawDistance}
      {...rest}
      style={[styles.list, style]}
    />
  )
}) as <T>(
  props: FlashListProps<T> & { ref?: React.Ref<FlashListRef<T>> },
) => React.ReactElement

const styles = StyleSheet.create({
  list: { flex: 1 },
})
