import { Redirect } from "expo-router"

type Props = {
  title: string
  webPath: string
  notice?: string
  fallbackHref?: string
}

/** @deprecated iOS no longer exposes external purchase screens — routes redirect to membership. */
export function IosExternalPurchaseScreen({ fallbackHref = "/membership" }: Props) {
  return <Redirect href={fallbackHref as never} />
}

export function IosCoraCreditsPurchaseScreen(props: Props) {
  return <IosExternalPurchaseScreen {...props} fallbackHref={props.fallbackHref ?? "/membership"} />
}
