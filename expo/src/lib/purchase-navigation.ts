import { Linking, Platform } from "react-native"
import { resolvePurchaseBaseUrl } from "../config/api"
import { buildPurchaseWebUrl, canonicalizePurchaseWebUrl } from "./purchase-web-url"
import { appendNativeQuery } from "../constants/module-web-paths"
import type { MembershipTier } from "../types/dashboard"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { FacultyBillingCadence } from "./faculty-membership-plans"
import type { MembershipBillingCadence } from "./membership-web-paths"
import { buildFacultyMembershipCheckoutWebPath, buildFacultyMembershipManageWebPath } from "./faculty-membership-web-paths"
import {
  buildMembershipCheckoutWebPath,
  buildMembershipManageWebPath,
} from "./membership-web-paths"
import type { FacultySession, GuestSession, StudentSession } from "./session"
import { coraCreditsApi } from "./cora/credits/api"
import { guestApi } from "./guest-api"
import { markGuestCheckoutPending } from "./use-guest-checkout-return"
import { isAllowedDeepLinkHost } from "./trusted-origins"

/** iOS must never launch native checkout (PaymentSheet, Apple Pay, StoreKit, in-app WebView checkout). */
export function requiresExternalWebPurchase(): boolean {
  return Platform.OS === "ios"
}

/** iOS hides all purchase CTAs and blocks checkout/billing redirects — users purchase on the web independently. */
export function isIosPurchaseUiHidden(): boolean {
  return Platform.OS === "ios"
}

export function shouldShowPurchaseCta(): boolean {
  return !isIosPurchaseUiHidden()
}

export function iosMembershipRequiredNotice(tierLabel: string): string {
  return `This feature requires ${tierLabel} membership.`
}

export function iosInsufficientCoraCreditsNotice(): string {
  return "Your available Cora credits have been used."
}

export function iosCoraLiteNotice(): string {
  return "Premium generation needs Cora credits. Cora Lite supports grades, deadlines, and navigation."
}

export function iosLowCoraCreditsNotice(): string {
  return "Your Cora credit balance is running low."
}

export function tierLockedAlertButtons(onViewPlans?: () => void) {
  if (isIosPurchaseUiHidden()) {
    return [{ text: "OK", style: "cancel" as const }]
  }
  return [
    { text: "Not now", style: "cancel" as const },
    { text: "View plans", onPress: onViewPlans },
  ]
}

export function insufficientCreditsAlertButtons(onViewPacks?: () => void) {
  if (isIosPurchaseUiHidden()) {
    return [{ text: "OK", style: "cancel" as const }]
  }
  return [
    { text: "Not now", style: "cancel" as const },
    { text: "View packs", onPress: onViewPacks },
  ]
}

/** @deprecated Prefer `requiresExternalWebPurchase`. */
export function shouldBlockNativeDigitalCheckout(): boolean {
  return requiresExternalWebPurchase()
}

export function resolvePurchaseWebUrl(path: string): string {
  return buildPurchaseWebUrl(resolvePurchaseBaseUrl(), path)
}

async function openExternalUrl(url: string): Promise<void> {
  if (isIosPurchaseUiHidden()) return
  const trimmed = canonicalizePurchaseWebUrl(url)
  if (!trimmed) {
    throw new Error("Purchase link is unavailable.")
  }
  const canOpen = await Linking.canOpenURL(trimmed)
  if (!canOpen) {
    throw new Error("Unable to open CourseCollab in your browser.")
  }
  await Linking.openURL(trimmed)
}

/** Opens a CourseCollab web path in the system browser (Safari on iOS). */
export async function openPurchaseWebPath(path: string): Promise<void> {
  await openExternalUrl(resolvePurchaseWebUrl(path))
}

export async function openMembershipPurchase(options: {
  tier: MembershipTier | FacultyMembershipTier
  cadence?: MembershipBillingCadence | FacultyBillingCadence
  portal: "student" | "faculty"
}): Promise<void> {
  if (isIosPurchaseUiHidden()) return
  if (requiresExternalWebPurchase()) {
    const path =
      options.portal === "faculty"
        ? buildFacultyMembershipCheckoutWebPath(
            options.tier as FacultyMembershipTier,
            (options.cadence as FacultyBillingCadence) ?? "semester",
          )
        : buildMembershipCheckoutWebPath(
            options.tier as MembershipTier,
            (options.cadence as MembershipBillingCadence) ?? "semester",
          )
    await openPurchaseWebPath(path)
    return
  }
  throw new Error("Native membership checkout must be routed through in-app screens on this platform.")
}

export async function openBillingPortal(portal: "student" | "faculty"): Promise<void> {
  const path =
    portal === "faculty" ? buildFacultyMembershipManageWebPath() : buildMembershipManageWebPath()
  await openPurchaseWebPath(path)
}

export async function openUpgradePage(options: {
  tier: MembershipTier | FacultyMembershipTier
  cadence?: MembershipBillingCadence | FacultyBillingCadence
  portal: "student" | "faculty"
}): Promise<void> {
  await openMembershipPurchase(options)
}

function assertCourseCollabCheckoutUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    if (!isAllowedDeepLinkHost(host)) {
      throw new Error("Unexpected checkout host.")
    }
  } catch {
    throw new Error("Invalid checkout URL.")
  }
  return canonicalizePurchaseWebUrl(url)
}

export function buildStudentCoraCreditsWebPath(packId?: string): string {
  const params = new URLSearchParams()
  if (packId) params.set("pack", packId)
  const query = params.toString()
  return appendNativeQuery(
    `/student/dashboard-v2/membership${query ? `?${query}` : ""}`,
  )
}

export function buildInstructorCoraCreditsWebPath(packId?: string): string {
  const params = new URLSearchParams()
  if (packId) params.set("pack", packId)
  const query = params.toString()
  return appendNativeQuery(
    `/instructor/dashboard-v2/membership${query ? `?${query}` : ""}`,
  )
}

export function buildGuestCoraCreditsWebPath(packId?: string): string {
  const params = new URLSearchParams()
  if (packId) params.set("pack", packId)
  const query = params.toString()
  return appendNativeQuery(`/student/dashboard-v2/guest/cora-credits${query ? `?${query}` : ""}`)
}

export function buildGuestCoraCareerWebPath(): string {
  return appendNativeQuery("/student/dashboard-v2/guest/cora-career/checkout")
}

export async function openCreditPurchase(options: {
  audience: "student" | "instructor"
  session: StudentSession | FacultySession
  packId: string
}): Promise<void> {
  if (isIosPurchaseUiHidden()) return
  if (requiresExternalWebPurchase()) {
    try {
      const checkout =
        options.audience === "student"
          ? await coraCreditsApi.startStudentCheckout(options.session as StudentSession, options.packId)
          : await coraCreditsApi.startInstructorCheckout(options.session as FacultySession, options.packId)
      await openExternalUrl(assertCourseCollabCheckoutUrl(checkout.redirectUrl))
      return
    } catch {
      const fallbackPath =
        options.audience === "student"
          ? buildStudentCoraCreditsWebPath(options.packId)
          : buildInstructorCoraCreditsWebPath(options.packId)
      await openPurchaseWebPath(fallbackPath)
    }
    return
  }
  throw new Error("Native credit checkout must be routed through in-app screens on this platform.")
}

export async function openGuestCreditPurchase(session: GuestSession, packId: string): Promise<void> {
  if (isIosPurchaseUiHidden()) return
  if (requiresExternalWebPurchase()) {
    try {
      const result = await guestApi.startCreditPackCheckout(session, packId)
      const url = result.url?.trim()
      if (url) {
        await markGuestCheckoutPending()
        await openExternalUrl(assertCourseCollabCheckoutUrl(url))
        return
      }
    } catch {
      /* fall through to web path */
    }
    await openPurchaseWebPath(buildGuestCoraCreditsWebPath(packId))
    await markGuestCheckoutPending()
    return
  }
  throw new Error("Native guest credit checkout must be routed through in-app screens on this platform.")
}

export async function openGuestCoraCareerPurchase(session: GuestSession): Promise<void> {
  if (isIosPurchaseUiHidden()) return
  if (requiresExternalWebPurchase()) {
    try {
      const result = await guestApi.startCoraCareerCheckout(session)
      const url = result.url?.trim()
      if (url) {
        await markGuestCheckoutPending()
        await openExternalUrl(assertCourseCollabCheckoutUrl(url))
        return
      }
    } catch {
      /* fall through */
    }
    await openPurchaseWebPath(buildGuestCoraCareerWebPath())
    await markGuestCheckoutPending()
    return
  }
  throw new Error("Native guest career checkout must be routed through in-app screens on this platform.")
}

export function iosMembershipPurchaseNotice(): string {
  return "Membership changes are completed on the CourseCollab website. Your plan syncs automatically after payment."
}

export function iosCoraCreditsPurchaseNotice(): string {
  return "Cora credit packs are purchased on the CourseCollab website. Credits sync to your account after payment."
}

export function iosExternalPurchaseCtaLabel(): string {
  return "Continue on CourseCollab Web"
}

export function iosManageOnWebCtaLabel(): string {
  return "Manage on CourseCollab Web"
}
