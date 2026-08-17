import { useCallback, useEffect, useRef } from "react"
import { AppState, type AppStateStatus } from "react-native"
import * as SecureStore from "expo-secure-store"
import { useGuestEntitlements } from "../context/GuestEntitlementsProvider"
import { guestApi } from "./guest-api"
import { pollGuestEntitlementsUntilChanged } from "./guest-checkout-poll"
import type { GuestSession } from "./session"

const PENDING_CHECKOUT_KEY = "guest_checkout_pending_v1"

export async function markGuestCheckoutPending(): Promise<void> {
  await SecureStore.setItemAsync(PENDING_CHECKOUT_KEY, String(Date.now()))
}

export async function clearGuestCheckoutPending(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_CHECKOUT_KEY)
}

async function isGuestCheckoutPending(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(PENDING_CHECKOUT_KEY)
  if (!raw) return false
  const started = Number(raw)
  if (!Number.isFinite(started)) return false
  // Expire after 30 minutes
  return Date.now() - started < 30 * 60 * 1000
}

/** Poll entitlements when app returns to foreground after Stripe Checkout. */
export function useGuestCheckoutReturnRefresh(session: GuestSession | null) {
  const { entitlements, refresh } = useGuestEntitlements()
  const entitlementsRef = useRef(entitlements)
  entitlementsRef.current = entitlements

  const pollAfterCheckout = useCallback(async () => {
    if (!session) return
    const pending = await isGuestCheckoutPending()
    if (!pending) return

    const baseline = {
      plan: entitlementsRef.current.plan,
      coraCredits: entitlementsRef.current.coraCredits,
    }
    const updated = await pollGuestEntitlementsUntilChanged(
      () => guestApi.getEntitlements(session),
      baseline,
    )
    if (updated) {
      await clearGuestCheckoutPending()
      await refresh()
    }
  }, [refresh, session])

  useEffect(() => {
    if (!session) return
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void pollAfterCheckout()
    })
    return () => subscription.remove()
  }, [pollAfterCheckout, session])
}
