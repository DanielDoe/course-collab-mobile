import { defaultGuestPlans } from "./guest-entitlements-defaults"
import type { GuestCreditPack } from "./guest-types"

export type GuestDisplayCreditPack = {
  id: string
  label: string
  credits: number
  priceLabel: string
  priceInCents: number
  description: string
  perThousandLabel: string
  highlight?: boolean
  highlights?: string[]
}

function perThousandLabel(credits: number, priceInCents: number): string {
  if (!credits || !priceInCents) return ""
  const per1k = (priceInCents / 100 / credits) * 1000
  return `$${per1k.toFixed(2)} per 1k credits`
}

function parsePriceLabel(label: string): number {
  const match = label.replace(/,/g, "").match(/\$?\s*([\d.]+)/)
  if (!match?.[1]) return 0
  return Math.round(Number(match[1]) * 100)
}

function resolveHighlightPackId(packs: GuestCreditPack[]): string | null {
  if (!packs.length) return null
  const popular = packs.find((pack) => pack.popular)
  if (popular) return popular.id
  return bestValuePackIdFromGuest(packs)
}

function bestValuePackIdFromGuest(packs: GuestCreditPack[]): string | null {
  if (!packs.length) return null
  let best = packs[0]!
  let bestRatio = (best.priceCents ?? parsePriceLabel(best.priceLabel)) / Math.max(best.credits, 1)
  for (const pack of packs.slice(1)) {
    const priceInCents = pack.priceCents ?? parsePriceLabel(pack.priceLabel)
    const ratio = priceInCents / Math.max(pack.credits, 1)
    if (ratio < bestRatio) {
      best = pack
      bestRatio = ratio
    }
  }
  return best.id
}

/** Guest credit packs from `/api/guest/cora-career/plans` (no student pack merge). */
export function normalizeGuestDisplayCreditPacks(
  guestPacks: GuestCreditPack[] | undefined,
): GuestDisplayCreditPack[] {
  const source = guestPacks?.length ? guestPacks : defaultGuestPlans().creditPacks
  const highlightId = resolveHighlightPackId(source)

  return source.map((pack) => {
    const priceInCents = pack.priceCents ?? parsePriceLabel(pack.priceLabel)
    const priceLabel =
      pack.priceLabel || (priceInCents ? `$${(priceInCents / 100).toFixed(2)}` : "$0.00")
    const credits = pack.credits
    return {
      id: pack.id,
      label: pack.label || `${credits.toLocaleString()} credits`,
      credits,
      priceLabel,
      priceInCents,
      description:
        pack.description ??
        "Purchased credits stack on your lifetime balance and work across eligible Cora tools.",
      perThousandLabel: perThousandLabel(credits, priceInCents),
      highlight: highlightId != null && pack.id === highlightId,
      highlights: pack.highlights,
    }
  })
}

/** @deprecated Use normalizeGuestDisplayCreditPacks — guest packs must not merge with student packs. */
export function mergeGuestCreditPacks(
  guestPacks: GuestCreditPack[] | undefined,
  _studentPacks?: unknown,
): GuestDisplayCreditPack[] {
  return normalizeGuestDisplayCreditPacks(guestPacks)
}

export function bestValuePackId(packs: GuestDisplayCreditPack[]): string | null {
  if (!packs.length) return null
  let best = packs[0]!
  let bestRatio = best.priceInCents / Math.max(best.credits, 1)
  for (const pack of packs.slice(1)) {
    const ratio = pack.priceInCents / Math.max(pack.credits, 1)
    if (ratio < bestRatio) {
      best = pack
      bestRatio = ratio
    }
  }
  return best.id
}
