import type { StudentSession } from "./session"
import { studentApi } from "./student-api"

export type MembershipPurchase = {
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

export type MembershipStripeSubscription = {
  id: string
  status: string
  planName: string
  amount: number
  currency: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  created: string
}

export type MembershipPurchasesResponse = {
  purchases: MembershipPurchase[]
  subscriptions: MembershipStripeSubscription[]
  message?: string
}

export async function fetchMembershipPurchases(
  session: StudentSession,
): Promise<MembershipPurchasesResponse> {
  return studentApi.getMembershipPurchases(session)
}

export function formatPurchaseAmount(amount: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}
