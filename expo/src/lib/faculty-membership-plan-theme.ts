import { hexToRgba, type AppThemeTokens } from "../constants/app-themes"
import type { FacultyMembershipTier } from "../types/dashboard"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import {
  getFacultyMembershipPlan,
  type FacultyMembershipPlan,
} from "./faculty-membership-plans"

/** All tiers use fixed Color Hunt palette — no appearance-theme override. */
export const THEME_BOUND_FACULTY_MEMBERSHIP_TIERS: readonly FacultyMembershipTier[] = []

export type FacultyMembershipTierSolidBadge = {
  fill: string
  ink: string
  border: string
}

export type FacultyMembershipTierHeroCard = {
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

/** Solid Color Hunt pill for drawer / profile tier badge. */
export function facultyMembershipTierSolidBadge(tier: FacultyMembershipTier): FacultyMembershipTierSolidBadge {
  switch (tier) {
    case "Enterprise":
      return {
        fill: COLOR_HUNT_COOL.gold,
        ink: COLOR_HUNT.ink,
        border: COLOR_HUNT_COOL.gold,
      }
    case "Pro":
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

/** Solid tier hero card — opaque Color Hunt header fill for readable contrast. */
export function facultyMembershipTierHeroCardStyle(
  tier: FacultyMembershipTier,
  _tokens: AppThemeTokens,
): FacultyMembershipTierHeroCard {
  const plan = getFacultyMembershipPlan(tier)
  const onLightFill = tier === "Enterprise"
  const title = onLightFill ? COLOR_HUNT.ink : "#FFFFFF"
  const muted = onLightFill ? "rgba(74, 46, 10, 0.78)" : "rgba(255, 255, 255, 0.88)"

  const bubbles = onLightFill
    ? {
        a: "rgba(74, 46, 10, 0.10)",
        b: "rgba(74, 46, 10, 0.07)",
        c: "rgba(255, 255, 255, 0.14)",
      }
    : {
        a: "rgba(255, 255, 255, 0.16)",
        b: "rgba(255, 255, 255, 0.11)",
        c: "rgba(255, 255, 255, 0.08)",
      }

  return {
    background: plan.headerBg,
    border: plan.accentDark,
    iconFill: onLightFill ? hexToRgba(COLOR_HUNT.ink, 0.12) : plan.accent,
    iconColor: onLightFill ? COLOR_HUNT.ink : "#FFFFFF",
    title,
    subtitle: muted,
    eyebrow: muted,
    exploreBtnBg: onLightFill ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.14)",
    exploreBtnBorder: onLightFill ? "rgba(74, 46, 10, 0.18)" : "rgba(255, 255, 255, 0.24)",
    exploreBtnText: onLightFill ? COLOR_HUNT.ink : "#FFFFFF",
    billingBtnBg: onLightFill ? COLOR_HUNT.ink : "#FFFFFF",
    billingBtnText: onLightFill ? "#FFFFFF" : plan.accentDark,
    bubbles,
  }
}

export function facultyMembershipTierUsesThemeAccent(_tier: FacultyMembershipTier): boolean {
  return false
}

export function getThemedFacultyMembershipPlan(
  tier: FacultyMembershipTier,
  _tokens: AppThemeTokens,
): FacultyMembershipPlan {
  return getFacultyMembershipPlan(tier)
}

export function resolveThemedFacultyMembershipPlans(
  tiers: FacultyMembershipTier[],
  _tokens: AppThemeTokens,
): FacultyMembershipPlan[] {
  return tiers.map((tier) => getFacultyMembershipPlan(tier))
}
