export type KeyboardAwareFormPlatform = "ios" | "android"

export function keyboardAwareFormLayout(args: {
  platform: KeyboardAwareFormPlatform
  hasFooter: boolean
  safeBottom: number
  extraBottomPadding: number
  keyboardHeight: number
}): {
  scrollPaddingBottom: number
  useAutomaticKeyboardInsets: boolean
  avoidingBehavior: "padding"
} {
  const footerReserve = args.hasFooter ? 8 : Math.max(args.safeBottom, 0)
  const androidOpenPad =
    args.platform === "android" && !args.hasFooter ? Math.max(args.keyboardHeight, 0) : 0
  const footerFieldClearance = args.hasFooter && args.keyboardHeight > 0 ? 12 : 0
  return {
    scrollPaddingBottom: args.extraBottomPadding + footerReserve + androidOpenPad + footerFieldClearance,
    useAutomaticKeyboardInsets: args.platform === "ios" && !args.hasFooter,
    avoidingBehavior: "padding",
  }
}
