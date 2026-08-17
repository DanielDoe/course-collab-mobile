import { NativeModules } from "react-native"

/** True when the dev client was rebuilt with @stripe/stripe-react-native linked. */
export function isStripeNativeAvailable(): boolean {
  return Boolean(NativeModules.StripeSdk)
}
