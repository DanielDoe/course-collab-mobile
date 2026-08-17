import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { fetchStripeClientConfig } from "../lib/stripe-config-api"
import { isStripeNativeAvailable } from "../lib/stripe-native"

export const STRIPE_RETURN_URL = "coursecollab://stripe-redirect"
export const APPLE_MERCHANT_ID = "merchant.com.coursecollab.app"

type Props = {
  children: ReactNode
}

type StripeProviderComponent = ComponentType<{
  publishableKey: string
  merchantIdentifier: string
  urlScheme: string
  children: ReactNode
}>

export function StripeAppProvider({ children }: Props) {
  const [publishableKey, setPublishableKey] = useState<string | null>(null)
  const [StripeProvider, setStripeProvider] = useState<StripeProviderComponent | null>(null)
  const nativeReady = isStripeNativeAvailable()

  useEffect(() => {
    let active = true
    fetchStripeClientConfig()
      .then((config) => {
        if (active) setPublishableKey(config.publishableKey)
      })
      .catch(() => {
        if (active) setPublishableKey("")
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!nativeReady || !publishableKey) return
    const stripe = require("@stripe/stripe-react-native") as {
      StripeProvider: StripeProviderComponent
    }
    setStripeProvider(() => stripe.StripeProvider)
  }, [nativeReady, publishableKey])

  if (!nativeReady || !publishableKey || !StripeProvider) {
    return <>{children}</>
  }

  const DeepLinkHandler = require("../components/support/StripeDeepLinkHandler")
    .StripeDeepLinkHandler as ComponentType<{ children: ReactNode }>

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier={APPLE_MERCHANT_ID}
      urlScheme="coursecollab"
    >
      <DeepLinkHandler>{children}</DeepLinkHandler>
    </StripeProvider>
  )
}
