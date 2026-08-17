import { RowStyle, type AppearanceParams } from "@stripe/stripe-react-native"
import type { AppThemeTokens } from "../constants/app-themes"

/**
 * Stripe Payment Element / PaymentSheet theming.
 * FlatWithCheckmark is used when Embedded PE is shown; PaymentSheet ignores it safely.
 */
export function buildStripeCheckoutAppearance(tokens: AppThemeTokens): AppearanceParams {
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
        style: RowStyle.FlatWithCheckmark,
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
