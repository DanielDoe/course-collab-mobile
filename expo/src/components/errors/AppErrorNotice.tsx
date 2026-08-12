import { useState } from "react"
import { Ionicons } from "@/components/icons/AppIcon"
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { semanticSoft } from "../../lib/themed-module-theme"
import type { ApiErrorKind, ApiErrorPresentation } from "../../lib/present-api-error"
import { presentApiError } from "../../lib/present-api-error"

type Variant = "card" | "inline" | "compact"

type Props = {
  presentation: ApiErrorPresentation
  onRetry?: () => void
  onDismiss?: () => void
  variant?: Variant
  style?: StyleProp<ViewStyle>
}

const ICONS: Record<ApiErrorKind, keyof typeof Ionicons.glyphMap> = {
  network: "cloud-offline-outline",
  server: "server-outline",
  client: "lock-closed-outline",
  unknown: "alert-circle-outline",
}

function statusLabel(status?: number): string | null {
  if (!status) return null
  if (status === 408) return "Timed out"
  if (status >= 500) return `Server error ${status}`
  if (status === 401) return "Not signed in"
  if (status === 403) return "No access"
  return `Error ${status}`
}

function errorKindAccent(tokens: ReturnType<typeof useAppThemeTokens>, kind: ApiErrorKind): string {
  switch (kind) {
    case "network":
      return tokens.warning
    case "server":
      return tokens.secondaryAccent
    case "client":
      return tokens.accent
    case "unknown":
    default:
      return tokens.danger
  }
}

export function AppErrorNotice({
  presentation,
  onRetry,
  onDismiss,
  variant = "card",
  style,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const [detailsOpen, setDetailsOpen] = useState(false)

  const icon = ICONS[presentation.kind]
  const chip = statusLabel(presentation.status)
  const compact = variant === "compact"
  const inline = variant === "inline"

  const accent = errorKindAccent(tokens, presentation.kind)
  const iconBg = semanticSoft(accent, tokens.isDark)

  return (
    <View
      style={[
        styles.shell,
        compact && styles.shellCompact,
        inline && styles.shellInline,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: native.separator,
          ...tokens.cardShadow,
        },
        style,
      ]}
    >
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.topRow}>
          <View style={[styles.iconTile, { backgroundColor: iconBg, borderColor: hexToRgba(accent, tokens.isDark ? 0.32 : 0.22) }]}>
            <Ionicons name={icon} size={compact ? 18 : 22} color={accent} />
          </View>

          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, compact && styles.titleCompact, { color: native.label }]} numberOfLines={2}>
                {presentation.title}
              </Text>
              {chip ? (
                <View style={[styles.chip, { backgroundColor: iconBg, borderColor: hexToRgba(accent, tokens.isDark ? 0.32 : 0.22) }]}>
                  <Text style={[styles.chipText, { color: accent }]}>{chip}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.message, compact && styles.messageCompact, { color: native.secondaryLabel }]}>
              {presentation.message}
            </Text>
          </View>

          {onDismiss ? (
            <Pressable
              onPress={onDismiss}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
              style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="close" size={18} color={native.tertiaryLabel} />
            </Pressable>
          ) : null}
        </View>

        {presentation.detail && !compact ? (
          <>
            <Pressable
              onPress={() => setDetailsOpen((open) => !open)}
              style={({ pressed }) => [styles.detailsToggle, pressed && { opacity: 0.75 }]}
              accessibilityRole="button"
              accessibilityState={{ expanded: detailsOpen }}
            >
              <Ionicons
                name={detailsOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color={native.tertiaryLabel}
              />
              <Text style={[styles.detailsToggleText, { color: native.tertiaryLabel }]}>
                {detailsOpen ? "Hide details" : "Show details"}
              </Text>
            </Pressable>
            {detailsOpen ? (
              <View style={[styles.detailBox, { backgroundColor: native.fill, borderColor: native.separator }]}>
                <Text style={[styles.detailText, { color: native.secondaryLabel }]} selectable>
                  {presentation.detail}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {onRetry && presentation.retryable ? (
          <Pressable
            style={({ pressed }) => [
              styles.retryBtn,
              compact && styles.retryBtnCompact,
              { backgroundColor: tokens.accent, opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={onRetry}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

export function AppErrorNoticeFromError({
  error,
  feature,
  fallbackMessage,
  onRetry,
  onDismiss,
  variant,
  style,
}: {
  error: unknown
  feature?: string
  fallbackMessage?: string
  onRetry?: () => void
  onDismiss?: () => void
  variant?: Variant
  style?: StyleProp<ViewStyle>
}) {
  const presentation = presentApiError(error, { feature, fallbackMessage })
  return (
    <AppErrorNotice
      presentation={presentation}
      onRetry={onRetry}
      onDismiss={onDismiss}
      variant={variant}
      style={style}
    />
  )
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginHorizontal: 16,
  },
  shellCompact: {
    borderRadius: 14,
    marginHorizontal: 0,
  },
  shellInline: {
    marginHorizontal: 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  contentCompact: {
    paddingVertical: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  title: {
    flex: 1,
    minWidth: 120,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  titleCompact: {
    fontSize: 15,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  messageCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  dismissBtn: {
    padding: 2,
    marginTop: 2,
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  detailsToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  retryBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnCompact: {
    paddingVertical: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
})
