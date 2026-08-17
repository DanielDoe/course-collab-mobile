import { blendHexOnSurface, hexToRgba, type AppThemeTokens } from "../constants/app-themes"
import type { MembershipTier } from "../types/dashboard"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { getMembershipPlan, type MembershipPlan } from "./membership-plans"

function blendHex(a: string, b: string, weightA: number): string {
  const parse = (hex: string) => {
    const normalized = hex.replace("#", "")
    const full =
      normalized.length === 3
        ? normalized
            .split("")
            .map((c) => c + c)
            .join("")
        : normalized.slice(0, 6)
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    }
  }

  const aRgb = parse(a)
  const bRgb = parse(b)
  const w = Math.max(0, Math.min(1, weightA))
  const mix = (x: number, y: number) => Math.round(x * w + y * (1 - w))
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0")
  return `#${toHex(mix(aRgb.r, bRgb.r))}${toHex(mix(aRgb.g, bRgb.g))}${toHex(mix(aRgb.b, bRgb.b))}`
}

/** All tiers use fixed Color Hunt palette — no appearance-theme override. */
export const THEME_BOUND_MEMBERSHIP_TIERS: readonly MembershipTier[] = []

export type MembershipTierSolidBadge = {
  fill: string
  ink: string
  border: string
}

/** Solid Color Hunt pill for drawer / profile tier badge. */
export type MembershipTierHeroCard = {
  background: string
  border: string
  iconFill: string
  iconColor: string
  title: string
  subtitle: string
  eyebrow: string
  exploreBtnBg: string
  exploreBtnBorder: string
  exploreBtnText: string
  billingBtnBg: string
  billingBtnText: string
  bubbles: { a: string; b: string; c: string }
}

/** Solid tier hero card — Color Hunt fill blended with appearance accent + palette bubbles. */
export function membershipTierHeroCardStyle(
  tier: MembershipTier,
  tokens: AppThemeTokens,
): MembershipTierHeroCard {
  const badge = membershipTierSolidBadge(tier)
  const plan = getMembershipPlan(tier)
  const themeWeight = tokens.isDark ? 0.28 : 0.16
  const tierWeight = 1 - themeWeight
  const background = tokens.isDark
    ? blendHex(badge.fill, tokens.accent, tierWeight)
    : blendHexOnSurface(badge.fill, tokens.surface, 0.9)
  const border = blendHex(badge.border, tokens.accentDark, 0.78)
  const onLightFill = tier === "Trailblazer"
  const title = onLightFill ? badge.ink : "#FFFFFF"
  const muted = onLightFill ? "rgba(74, 46, 10, 0.78)" : "rgba(255, 255, 255, 0.78)"
  const exploreBtnOnDark = tokens.isDark && !onLightFill

  const bubbles = membershipTierHeroBubbles(tier, tokens, plan.accent)

  return {
    background,
    border,
    iconFill: badge.fill,
    iconColor: badge.ink,
    title,
    subtitle: muted,
    eyebrow: muted,
    exploreBtnBg: onLightFill
      ? hexToRgba("#FFFFFF", tokens.isDark ? 0.62 : 0.92)
      : exploreBtnOnDark
        ? hexToRgba(tokens.text, 0.14)
        : tokens.surface,
    exploreBtnBorder: hexToRgba(plan.accent, tokens.isDark ? 0.42 : 0.34),
    exploreBtnText: onLightFill ? plan.accentDark : exploreBtnOnDark ? tokens.text : plan.accent,
    billingBtnBg: plan.accent,
    billingBtnText: "#FFFFFF",
    bubbles,
  }
}

function membershipTierHeroBubbles(
  tier: MembershipTier,
  tokens: AppThemeTokens,
  accent: string,
): { a: string; b: string; c: string } {
  const themeBubble = hexToRgba(tokens.accent, tokens.isDark ? 0.2 : 0.12)
  switch (tier) {
    case "Trailblazer":
      return {
        a: hexToRgba(COLOR_HUNT.amber, tokens.isDark ? 0.26 : 0.18),
        b: hexToRgba(COLOR_HUNT.yellow, tokens.isDark ? 0.18 : 0.12),
        c: themeBubble,
      }
    case "Explorer":
      return {
        a: hexToRgba(accent, tokens.isDark ? 0.24 : 0.16),
        b: hexToRgba(COLOR_HUNT_COOL.sky, tokens.isDark ? 0.2 : 0.14),
        c: themeBubble,
      }
    default:
      return {
        a: hexToRgba(accent, tokens.isDark ? 0.22 : 0.14),
        b: hexToRgba(COLOR_HUNT_COOL.sky, tokens.isDark ? 0.16 : 0.1),
        c: themeBubble,
      }
  }
}

export function membershipTierSolidBadge(tier: MembershipTier): MembershipTierSolidBadge {
  switch (tier) {
    case "Trailblazer":
      return {
        fill: COLOR_HUNT_COOL.gold,
        ink: COLOR_HUNT.ink,
        border: COLOR_HUNT_COOL.gold,
      }
    case "Explorer":
      return {
        fill: COLOR_HUNT_COOL.cyan,
        ink: "#FFFFFF",
        border: COLOR_HUNT_COOL.cyan,
      }
    default:
      return {
        fill: COLOR_HUNT_COOL.indigo,
        ink: "#FFFFFF",
        border: COLOR_HUNT_COOL.indigo,
      }
  }
}

export function membershipTierUsesThemeAccent(_tier: MembershipTier): boolean {
  return false
}

export function resolveThemedMembershipPlan(plan: MembershipPlan, _tokens: AppThemeTokens): MembershipPlan {
  return plan
}

export function getThemedMembershipPlan(tier: MembershipTier, tokens: AppThemeTokens): MembershipPlan {
  return resolveThemedMembershipPlan(getMembershipPlan(tier), tokens)
}

export function resolveThemedMembershipPlans(
  plans: MembershipPlan[],
  tokens: AppThemeTokens,
): MembershipPlan[] {
  return plans.map((plan) => resolveThemedMembershipPlan(plan, tokens))
}
