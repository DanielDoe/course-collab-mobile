import { useCallback, useEffect, type ReactNode } from "react"
import { Linking } from "react-native"
import { useStripe } from "@stripe/stripe-react-native"

type Props = {
  children: ReactNode
}

export function StripeDeepLinkHandler({ children }: Props) {
  const { handleURLCallback } = useStripe()

  const handleDeepLink = useCallback(
    async (url: string | null) => {
      if (!url) return
      await handleURLCallback(url)
    },
    [handleURLCallback],
  )

  useEffect(() => {
    void Linking.getInitialURL().then(handleDeepLink)
    const subscription = Linking.addEventListener("url", (event) => {
      void handleDeepLink(event.url)
    })
    return () => subscription.remove()
  }, [handleDeepLink])

  return <>{children}</>
}
