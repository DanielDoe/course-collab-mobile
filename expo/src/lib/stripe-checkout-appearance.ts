import type { AppThemeTokens } from "../constants/app-themes"

/** Mirrors @stripe/stripe-react-native RowStyle without importing native Stripe in Expo Go. */
const FLAT_WITH_CHECKMARK = "FlatWithCheckmark" as const

type StripeAppearanceParams = {
  font?: { scale?: number }
  shapes?: { borderRadius?: number; borderWidth?: number }
  primaryButton?: {
    shapes?: { borderRadius?: number }
    colors?: { background?: string; text?: string }
  }
  colors?: Record<string, string | undefined>
  embeddedPaymentElement?: {
    row?: {
      style?: typeof FLAT_WITH_CHECKMARK
      additionalInsets?: number
      floating?: { spacing?: number }
      flat?: Record<string, unknown>
    }
  }
}

/**
 * Stripe Payment Element / PaymentSheet theming.
 * Typed locally so Expo Go never imports @stripe/stripe-react-native at module load.
 */
export function buildStripeCheckoutAppearance(tokens: AppThemeTokens): StripeAppearanceParams {
  const checkGlyph = "#FFFFFF"
  const selectionFill = tokens.isDark ? "#FFFFFF" : tokens.text

  return {
    font: {
      scale: 1.05,
    },
    shapes: {
      borderRadius: 14,
      borderWidth: 0.5,
    },
    primaryButton: {
      shapes: {
        borderRadius: 14,
      },
      colors: {
        background: tokens.accent,
        text: "#FFFFFF",
      },
    },
    colors: {
      primary: selectionFill,
      background: tokens.native.groupedBackground || tokens.chrome.sheetBg || tokens.background,
      componentBackground: tokens.surface,
      componentBorder: tokens.border,
      componentDivider: tokens.border,
      primaryText: tokens.text,
      secondaryText: tokens.textMuted,
      componentText: tokens.text,
      placeholderText: tokens.textMuted,
      icon: tokens.text,
    },
    embeddedPaymentElement: {
      row: {
        style: FLAT_WITH_CHECKMARK,
        additionalInsets: 12,
        floating: {
          spacing: 12,
        },
        flat: {
          separatorThickness: 0.5,
          separatorColor: tokens.border,
          separatorInsets: { top: 0, left: 56, bottom: 0, right: 0 },
          topSeparatorEnabled: false,
          bottomSeparatorEnabled: false,
          checkmark: {
            color: checkGlyph,
          },
          radio: {
            selectedColor: selectionFill,
            unselectedColor: tokens.border,
          },
        },
      },
    },
  }
}
