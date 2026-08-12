import type { FacultySession } from "./session"
import { instructorApi } from "./instructor-api"

export type FacultyMembershipPurchase = {
  id: string
  chargeId?: string
  amount: number
  amountCents: number
  currency: string
  status: string
  paidAt: string
  description: string
  invoicePdf?: string
  hostedInvoiceUrl?: string
  subscriptionId?: string
}

export type FacultyMembershipStripeSubscription = {
  id: string
  status: string
  planName: string
  amount: number
  currency: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  created: string
}

export type FacultyMembershipPurchasesResponse = {
  purchases: FacultyMembershipPurchase[]
  subscriptions: FacultyMembershipStripeSubscription[]
  message?: string
}

export async function fetchFacultyMembershipPurchases(
  session: FacultySession,
): Promise<FacultyMembershipPurchasesResponse> {
  return instructorApi.getMembershipPurchases(session.id)
}

export function formatFacultyPurchaseAmount(amount: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}
