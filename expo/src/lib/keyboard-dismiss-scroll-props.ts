/** Shared ScrollView / FlashList keyboard props — tap-through for controls, drag to dismiss. */
export const keyboardDismissScrollProps = {
  keyboardShouldPersistTaps: "handled" as const,
  keyboardDismissMode: "on-drag" as const,
}
