import { useMemo, type ComponentType } from "react"
import { Platform } from "react-native"
import { isStripeNativeAvailable } from "../../lib/stripe-native"
import type { MembershipNativePaymentPresenterProps } from "./MembershipNativePaymentPresenter"

/**
 * Lazy-loads the native PaymentSheet presenter so Expo Go / missing native
 * builds don't crash on import of @stripe/stripe-react-native hooks.
 */
export function MembershipNativePaymentPresenterGate(props: MembershipNativePaymentPresenterProps) {
  const nativeReady = useMemo(() => isStripeNativeAvailable(), [])
  if (Platform.OS === "ios" || !nativeReady || props.presentKey <= 0) return null

  const Presenter = require("./MembershipNativePaymentPresenter")
    .MembershipNativePaymentPresenter as ComponentType<MembershipNativePaymentPresenterProps>

  return <Presenter {...props} />
}
