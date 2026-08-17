import { useCallback, useEffect, useState, type ReactNode } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native"
import * as Clipboard from "expo-clipboard"
import * as DocumentPicker from "expo-document-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { hexToRgba } from "../../../constants/app-themes"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { ApiError } from "../../../lib/api"
import {
  classifyCareerError,
  guestCareerApi,
  type CareerGateInfo,
  type MatchBand,
  type ResumeProfile,
} from "../../../lib/guest-career-api"
import type { GuestSession } from "../../../lib/session"
import { useNativeType, semanticSoft } from "../../../lib/themed-module-theme"

/** Guest career accent — violet family used across the guest portal. */
export const CAREER_ACCENT = "#582c83"

export const MATCH_BAND_LABELS: Record<MatchBand, string> = {
  NEEDS_ALIGNMENT: "Needs alignment",
  DEVELOPING_MATCH: "Developing match",
  STRONG_MATCH: "Strong match",
  EXCELLENT_ALIGNMENT: "Excellent alignment",
}

export function scoreToBand(score: number): MatchBand {
  if (score >= 88) return "EXCELLENT_ALIGNMENT"
  if (score >= 70) return "STRONG_MATCH"
  if (score >= 45) return "DEVELOPING_MATCH"
  return "NEEDS_ALIGNMENT"
}

export function matchBandColor(band: MatchBand | string | null | undefined, isDark: boolean): string {
  switch (band) {
    case "EXCELLENT_ALIGNMENT":
      return isDark ? "#4ade80" : "#16a34a"
    case "STRONG_MATCH":
      return isDark ? "#a78bfa" : CAREER_ACCENT
    case "DEVELOPING_MATCH":
      return isDark ? "#fbbf24" : "#b45309"
    default:
      return isDark ? "#f87171" : "#dc2626"
  }
}

export function matchBandLabel(band: string | null | undefined, score?: number | null): string {
  if (band && band in MATCH_BAND_LABELS) return MATCH_BAND_LABELS[band as MatchBand]
  if (typeof score === "number") return MATCH_BAND_LABELS[scoreToBand(score)]
  return "—"
}

export function formatCareerDate(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** Rounded grouped card matching the guest portal look. */
export function CareerCard({
  title,
  icon,
  accent,
  children,
  style,
}: {
  title?: string
  icon?: keyof typeof Ionicons.glyphMap
  accent?: string
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const accentColor = accent ?? CAREER_ACCENT

  return (
    <View
      style={[
        styles.card,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
        style,
      ]}
    >
      {title ? (
        <View style={styles.cardHead}>
          {icon ? (
            <View style={[styles.cardIcon, { backgroundColor: semanticSoft(accentColor, tokens.isDark, 0.16) }]}>
              <Ionicons name={icon} size={15} color={tokens.isDark ? hexToRgba(accentColor, 0.9) : accentColor} />
            </View>
          ) : null}
          <Text style={[type.bodyEmphasis, { color: native.label, flex: 1 }]}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  )
}

/** Small rounded keyword/skill chip. */
export function CareerChip({
  label,
  color,
  icon,
  locked,
}: {
  label: string
  color: string
  icon?: keyof typeof Ionicons.glyphMap
  locked?: boolean
}) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: hexToRgba(color, tokens.isDark ? 0.16 : 0.1),
          borderColor: hexToRgba(color, tokens.isDark ? 0.34 : 0.22),
        },
      ]}
    >
      {locked ? (
        <Ionicons name="lock-closed" size={11} color={color} />
      ) : icon ? (
        <Ionicons name={icon} size={11} color={color} />
      ) : null}
      <Text style={[type.footnote, styles.chipText, { color }]} numberOfLines={1}>
        {locked ? "Locked" : label}
      </Text>
    </View>
  )
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>
}

/** Big score header: 0-100 score with a colored band label. */
export function ScoreHeader({ score, band }: { score: number; band?: MatchBand | string | null }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const resolvedBand = band && band in MATCH_BAND_LABELS ? (band as MatchBand) : scoreToBand(score)
  const color = matchBandColor(resolvedBand, tokens.isDark)

  return (
    <View style={styles.scoreHeader}>
      <View
        style={[
          styles.scoreCircle,
          { borderColor: hexToRgba(color, 0.45), backgroundColor: semanticSoft(color, tokens.isDark, 0.12) },
        ]}
      >
        <Text style={[styles.scoreValue, { color }]}>{Math.round(score)}</Text>
        <Text style={[type.footnote, { color: native.secondaryLabel }]}>/ 100</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={[
            styles.bandPill,
            { backgroundColor: semanticSoft(color, tokens.isDark, 0.16), alignSelf: "flex-start" },
          ]}
        >
          <Text style={[type.footnote, { color, fontWeight: "700" }]}>{MATCH_BAND_LABELS[resolvedBand]}</Text>
        </View>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Overall match score</Text>
      </View>
    </View>
  )
}

/** Labeled progress row for dimension scores. */
export function ScoreBarRow({ label, score }: { label: string; score: number }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const color = matchBandColor(scoreToBand(score), tokens.isDark)

  return (
    <View style={styles.scoreBarRow}>
      <View style={styles.scoreBarLabels}>
        <Text style={[type.caption, { color: native.label, flex: 1 }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[type.caption, { color, fontWeight: "700" }]}>{Math.round(score)}</Text>
      </View>
      <View style={[styles.scoreBarTrack, { backgroundColor: native.fill }]}>
        <View
          style={[
            styles.scoreBarFill,
            { width: `${Math.max(2, Math.min(100, score))}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  )
}

/** Friendly banner for gates (needs credits / upgrade / resume) and errors. */
export function CareerNotice({
  gate,
  onAction,
  actionLabel,
}: {
  gate: CareerGateInfo
  onAction?: () => void
  actionLabel?: string
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const visuals: Record<CareerGateInfo["kind"], { icon: keyof typeof Ionicons.glyphMap; color: string; title: string }> = {
    credits: {
      icon: "wallet-outline",
      color: tokens.isDark ? "#fbbf24" : "#b45309",
      title: "More Cora Credits needed",
    },
    upgrade: {
      icon: "lock-closed-outline",
      color: tokens.isDark ? "#a78bfa" : CAREER_ACCENT,
      title: "Unlock Cora Career",
    },
    resume: {
      icon: "document-text-outline",
      color: tokens.isDark ? "#60a5fa" : "#1d4ed8",
      title: "Add your résumé first",
    },
    error: {
      icon: "alert-circle-outline",
      color: tokens.isDark ? "#f87171" : "#dc2626",
      title: "Something went wrong",
    },
  }
  const visual = visuals[gate.kind]

  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor: semanticSoft(visual.color, tokens.isDark, 0.12),
          borderColor: hexToRgba(visual.color, tokens.isDark ? 0.36 : 0.24),
        },
      ]}
    >
      <Ionicons name={visual.icon} size={18} color={visual.color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[type.bodyEmphasis, { color: native.label }]}>{visual.title}</Text>
        <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>{gate.message}</Text>
        {gate.kind === "credits" && gate.creditCost != null ? (
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
            Requires {gate.creditCost} credits · you have {gate.creditsAvailable ?? 0}
          </Text>
        ) : null}
        {onAction ? (
          <Pressable onPress={onAction} hitSlop={6} style={{ marginTop: 4 }}>
            <Text style={[type.caption, { color: visual.color, fontWeight: "700" }]}>
              {actionLabel ??
                (gate.kind === "credits"
                  ? "Top up credits"
                  : gate.kind === "upgrade"
                    ? "See upgrade options"
                    : "Continue")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

/** Themed multiline input for job/opportunity descriptions. */
export function CareerTextArea({
  value,
  onChangeText,
  placeholder,
  minHeight = 140,
}: {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  minHeight?: number
}) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <TextInput
      style={[
        styles.textArea,
        type.body,
        {
          minHeight,
          color: native.label,
          backgroundColor: native.fill,
          borderColor: native.separator,
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={native.tertiaryLabel}
      multiline
      textAlignVertical="top"
    />
  )
}

/** Solid accent CTA button with loading state. */
export function CareerPrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
}: {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  icon?: keyof typeof Ionicons.glyphMap
}) {
  const isDisabled = Boolean(disabled || loading)

  return (
    <Pressable
      style={[styles.primaryButton, { backgroundColor: CAREER_ACCENT }, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : icon ? (
        <Ionicons name={icon} size={16} color="#ffffff" />
      ) : null}
      <Text style={styles.primaryButtonText}>{loading ? "Working…" : label}</Text>
    </Pressable>
  )
}

/** Copy-to-clipboard button with transient "Copied" feedback. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <Pressable
      style={[
        styles.copyButton,
        {
          backgroundColor: semanticSoft(CAREER_ACCENT, tokens.isDark, 0.14),
          borderColor: hexToRgba(CAREER_ACCENT, tokens.isDark ? 0.36 : 0.24),
        },
      ]}
      onPress={() => void handleCopy()}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={copied ? "checkmark-outline" : "copy-outline"}
        size={14}
        color={tokens.isDark ? "#a78bfa" : CAREER_ACCENT}
      />
      <Text style={[type.footnote, { color: tokens.isDark ? "#a78bfa" : CAREER_ACCENT, fontWeight: "700" }]}>
        {copied ? "Copied" : label}
      </Text>
    </Pressable>
  )
}

// ---------------------------------------------------------------------------
// Master résumé — shared load/upload logic
// ---------------------------------------------------------------------------

const RESUME_PICKER_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/*",
]

export function useMasterResume(session: GuestSession | null) {
  const [masterResume, setMasterResume] = useState<ResumeProfile | null>(null)
  const [loadingResume, setLoadingResume] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [resumeError, setResumeError] = useState("")

  const refreshResume = useCallback(async () => {
    if (!session) return
    setResumeError("")
    try {
      const payload = await guestCareerApi.getResumes(session)
      setMasterResume(payload.masterResume ?? null)
    } catch (err) {
      setResumeError(err instanceof ApiError ? err.message : "Could not load résumé.")
    }
  }, [session])

  useEffect(() => {
    setLoadingResume(true)
    void refreshResume().finally(() => setLoadingResume(false))
  }, [refreshResume])

  const pickAndUpload = useCallback(async () => {
    if (!session || uploading) return
    setResumeError("")
    const result = await DocumentPicker.getDocumentAsync({
      type: RESUME_PICKER_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setUploading(true)
    try {
      const payload = await guestCareerApi.uploadMasterResume(session, {
        uri: asset.uri,
        name: asset.name ?? "resume.pdf",
        type: asset.mimeType ?? "application/octet-stream",
      })
      setMasterResume(payload.resume)
    } catch (err) {
      setResumeError(err instanceof ApiError ? err.message : "Upload failed. Try again.")
    } finally {
      setUploading(false)
    }
  }, [session, uploading])

  return { masterResume, loadingResume, uploading, resumeError, refreshResume, pickAndUpload }
}

/** Master résumé status row: file name when set, upload prompt when missing. */
export function MasterResumeCard({
  resume,
  loading,
  uploading,
  error,
  onUpload,
}: {
  resume: ResumeProfile | null
  loading?: boolean
  uploading?: boolean
  error?: string
  onUpload: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const accent = tokens.isDark ? "#a78bfa" : CAREER_ACCENT

  const resumeName =
    resume?.originalFileName ?? resume?.label ?? (resume?.parsedText ? "Pasted résumé text" : null)

  return (
    <CareerCard title="Master résumé" icon="reader-outline">
      {loading ? (
        <ActivityIndicator size="small" color={native.tint} style={{ alignSelf: "flex-start" }} />
      ) : resume ? (
        <View style={styles.resumeRow}>
          <View style={[styles.resumeIcon, { backgroundColor: semanticSoft(tokens.success, tokens.isDark, 0.16) }]}>
            <Ionicons name="document-attach-outline" size={18} color={tokens.success} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.body, { color: native.label }]} numberOfLines={1}>
              {resumeName}
            </Text>
            <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
              Updated {formatCareerDate(resume.updatedAt) || "recently"}
            </Text>
          </View>
          <Pressable onPress={onUpload} hitSlop={6} disabled={uploading}>
            <Text style={[type.footnote, { color: accent, fontWeight: "700" }]}>
              {uploading ? "Uploading…" : "Replace"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
            Upload your résumé once — Cora reuses it for matches, cover letters, and optimizations.
          </Text>
          <CareerPrimaryButton
            label="Upload résumé"
            icon="cloud-upload-outline"
            onPress={onUpload}
            loading={uploading}
          />
        </View>
      )}
      {error ? <Text style={[type.footnote, { color: tokens.isDark ? "#f87171" : "#dc2626" }]}>{error}</Text> : null}
    </CareerCard>
  )
}

/** Convenience — classify an unknown error into a CareerNotice gate. */
export function toCareerGate(err: unknown): CareerGateInfo {
  return classifyCareerError(err)
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  chipText: { fontWeight: "700" },
  scoreHeader: { flexDirection: "row", alignItems: "center", gap: 16 },
  scoreCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  bandPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scoreBarRow: { gap: 5 },
  scoreBarLabels: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreBarTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  scoreBarFill: { height: 6, borderRadius: 999 },
  notice: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    lineHeight: 21,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 13,
    minHeight: NATIVE.buttonMinHeight,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  resumeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  resumeIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
})
