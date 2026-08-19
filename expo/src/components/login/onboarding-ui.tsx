import type { ReactNode } from "react"
import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { LegalDocument } from "../../content/legal/types"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAuthFlowContentStyle } from "../../lib/responsive-layout"
import type { AppSession } from "../../lib/session"
import {
  onboardingStepMeta,
  type OnboardingStepId,
} from "../../lib/onboarding"
import { LoginButton } from "./LoginButton"
import { useLoginTheme } from "./login-theme"

const CONTENT_PAD = 20

type OnboardingShellProps = {
  session: AppSession
  stepId: OnboardingStepId
  pillLabel: string
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  children: ReactNode
  footer?: ReactNode
  scrollable?: boolean
}

export function OnboardingShell({
  session,
  stepId,
  pillLabel,
  title,
  subtitle,
  icon,
  children,
  footer,
  scrollable = true,
}: OnboardingShellProps) {
  const insets = useSafeAreaInsets()
  const { LOGIN, loginType } = useLoginTheme()
  const contentStyle = useAuthFlowContentStyle()
  const { stepIndex, totalSteps, progress } = onboardingStepMeta(session, stepId)

  const body = (
    <>
      <View style={styles.header}>
        <View style={[styles.pill, { backgroundColor: LOGIN.soft, borderColor: LOGIN.softBorder }]}>
          <Ionicons name={icon} size={14} color={LOGIN.purple} />
          <Text style={[styles.pillText, { color: LOGIN.purple }]}>{pillLabel}</Text>
        </View>
        <Text style={[loginType.heroTitle, styles.title]}>{title}</Text>
        <Text style={[loginType.heroSubtitle, styles.subtitle]}>{subtitle}</Text>
      </View>
      {children}
    </>
  )

  return (
    <View style={[styles.root, { backgroundColor: LOGIN.canvas }]}>
      <View style={[styles.progressTrack, contentStyle, { paddingTop: insets.top + 8, backgroundColor: LOGIN.canvas }]}>
        <View style={[styles.progressBar, { backgroundColor: LOGIN.separator }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: LOGIN.purple },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: LOGIN.secondaryLabel }]}>
          Step {stepIndex + 1} of {totalSteps}
        </Text>
      </View>

      {scrollable ? (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            contentStyle,
            { paddingBottom: footer ? 12 : insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, contentStyle, { flex: 1 }]}>{body}</View>
      )}

      {footer ? (
        <View
          style={[
            styles.footer,
            contentStyle,
            {
              paddingBottom: insets.bottom + 16,
              backgroundColor: LOGIN.canvas,
              borderTopColor: LOGIN.separator,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  )
}

function openEmail(address: string) {
  void Linking.openURL(`mailto:${address}`)
}

function OnboardingParagraph({ text, emphasis }: { text: string; emphasis?: boolean }) {
  const { LOGIN, loginType } = useLoginTheme()
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())

  if (isEmail) {
    return (
      <Pressable onPress={() => openEmail(text.trim())} accessibilityRole="link">
        <Text style={[loginType.body, styles.paragraph, { color: LOGIN.purple, fontWeight: "600" }]}>
          {text}
        </Text>
      </Pressable>
    )
  }

  return (
    <Text
      style={[
        loginType.body,
        styles.paragraph,
        { color: emphasis ? LOGIN.label : LOGIN.label, opacity: emphasis ? 1 : 0.92 },
      ]}
    >
      {text}
    </Text>
  )
}

function OnboardingSectionCard({
  title,
  paragraphs,
  bullets,
}: {
  title: string
  paragraphs?: readonly string[]
  bullets?: readonly string[]
}) {
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <View style={styles.sectionWrap}>
      <Text style={[loginType.fieldLabel, styles.sectionHeader, { color: LOGIN.secondaryLabel }]}>
        {title}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: LOGIN.grouped, borderColor: LOGIN.separator },
        ]}
      >
        {paragraphs?.map((paragraph) => (
          <OnboardingParagraph key={paragraph} text={paragraph} />
        ))}
        {bullets?.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Text style={[loginType.body, styles.bulletDot, { color: LOGIN.purple }]}>•</Text>
            <OnboardingParagraph text={bullet} />
          </View>
        ))}
      </View>
    </View>
  )
}

type OnboardingLegalContentProps = {
  document: LegalDocument | null
  loading?: boolean
  error?: string | null
  source?: "network" | "cache" | "fallback" | null
  onRetry?: () => void
}

export function OnboardingLegalContent({
  document,
  loading,
  error,
  onRetry,
  source,
}: OnboardingLegalContentProps) {
  const { LOGIN, loginType } = useLoginTheme()

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={LOGIN.purple} />
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>Loading document…</Text>
      </View>
    )
  }

  if (error || !document) {
    return (
      <View style={[styles.errorCard, { backgroundColor: LOGIN.grouped, borderColor: LOGIN.separator }]}>
        <Text style={[loginType.body, { color: LOGIN.label }]}>
          {error ?? "This document could not be loaded."}
        </Text>
        {onRetry ? (
          <Pressable
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: LOGIN.purple, opacity: pressed ? NATIVE.pressedOpacity : 1 },
            ]}
            onPress={onRetry}
          >
            <Text style={[loginType.button, { color: "#FFFFFF" }]}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    )
  }

  return (
    <View style={styles.legalRoot}>
      <View style={[styles.metaCard, { backgroundColor: LOGIN.fill, borderColor: LOGIN.separator }]}>
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
          Last updated {document.updated}
        </Text>
        {document.intro ? (
          <Text style={[loginType.body, styles.intro, { color: LOGIN.label }]}>{document.intro}</Text>
        ) : null}
        {source === "fallback" || source === "cache" ? (
          <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
            {source === "fallback"
              ? "Showing bundled copy — connect to refresh from CourseCollab."
              : "Showing cached copy — refresh when online."}
          </Text>
        ) : null}
      </View>

      {document.sections.map((section) => (
        <OnboardingSectionCard
          key={section.title}
          title={section.title}
          paragraphs={section.paragraphs}
          bullets={section.bullets}
        />
      ))}
    </View>
  )
}

type OnboardingAcceptFooterProps = {
  agreeLabel: string
  continueLabel: string
  checked: boolean
  onToggleCheck: () => void
  onContinue: () => void
  loading?: boolean
  disabled?: boolean
  hint?: string
}

export function OnboardingAcceptFooter({
  agreeLabel,
  continueLabel,
  checked,
  onToggleCheck,
  onContinue,
  loading,
  disabled,
  hint,
}: OnboardingAcceptFooterProps) {
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <View style={styles.footerInner}>
      {hint ? (
        <Text style={[loginType.info, styles.footerHint, { color: LOGIN.secondaryLabel }]}>{hint}</Text>
      ) : null}
      <Pressable
        style={({ pressed }) => [
          styles.checkRow,
          {
            backgroundColor: LOGIN.grouped,
            borderColor: checked ? LOGIN.purple : LOGIN.separator,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
        onPress={onToggleCheck}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: checked ? LOGIN.purple : LOGIN.secondaryLabel,
              backgroundColor: checked ? LOGIN.purple : "transparent",
            },
          ]}
        >
          {checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        </View>
        <Text style={[loginType.body, styles.checkLabel, { color: LOGIN.label }]}>{agreeLabel}</Text>
      </Pressable>
      <LoginButton
        label={continueLabel}
        icon="arrow-forward"
        onPress={onContinue}
        loading={loading}
        disabled={disabled || !checked}
      />
    </View>
  )
}

/** Scrollable legal step with read-to-end hint and accept footer. */
export function OnboardingLegalStepLayout({
  session,
  stepId,
  pillLabel,
  title,
  subtitle,
  icon,
  document,
  loading,
  error,
  source,
  onRetry,
  agreeLabel,
  continueLabel,
  onAccept,
  accepting,
}: {
  session: AppSession
  stepId: OnboardingStepId
  pillLabel: string
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  document: LegalDocument | null
  loading?: boolean
  error?: string | null
  source?: "network" | "cache" | "fallback" | null
  onRetry?: () => void
  agreeLabel: string
  continueLabel: string
  onAccept: () => void
  accepting?: boolean
}) {
  const insets = useSafeAreaInsets()
  const { LOGIN, loginType } = useLoginTheme()
  const contentStyle = useAuthFlowContentStyle()
  const { stepIndex, totalSteps, progress } = onboardingStepMeta(session, stepId)
  const [checked, setChecked] = useState(false)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  const needsScroll = contentHeight > viewportHeight + 24
  const canAccept = !needsScroll || scrolledToEnd

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
      const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 48
      if (nearBottom) setScrolledToEnd(true)
    },
    [],
  )

  const onContentSizeChange = useCallback((_w: number, h: number) => {
    setContentHeight(h)
    if (h <= viewportHeight + 24) setScrolledToEnd(true)
  }, [viewportHeight])

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height)
  }, [])

  const scrollHint = useMemo(() => {
    if (!canAccept && document && !loading) {
      return "Scroll to the end to enable acceptance."
    }
    return undefined
  }, [canAccept, document, loading])

  return (
    <View style={[styles.root, { backgroundColor: LOGIN.canvas }]}>
      <View style={[styles.progressTrack, contentStyle, { paddingTop: insets.top + 8, backgroundColor: LOGIN.canvas }]}>
        <View style={[styles.progressBar, { backgroundColor: LOGIN.separator }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: LOGIN.purple },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: LOGIN.secondaryLabel }]}>
          Step {stepIndex + 1} of {totalSteps}
        </Text>
      </View>

      <ScrollView
        style={styles.legalScroll}
        contentContainerStyle={[styles.scroll, contentStyle, { paddingBottom: 12 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={onContentSizeChange}
        onLayout={onLayout}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View style={styles.header}>
          <View style={[styles.pill, { backgroundColor: LOGIN.soft, borderColor: LOGIN.softBorder }]}>
            <Ionicons name={icon} size={14} color={LOGIN.purple} />
            <Text style={[styles.pillText, { color: LOGIN.purple }]}>{pillLabel}</Text>
          </View>
          <Text style={[loginType.heroTitle, styles.title]}>{title}</Text>
          <Text style={[loginType.heroSubtitle, styles.subtitle]}>{subtitle}</Text>
        </View>

        <OnboardingLegalContent
          document={document}
          loading={loading}
          error={error}
          source={source}
          onRetry={onRetry}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          contentStyle,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: LOGIN.canvas,
            borderTopColor: LOGIN.separator,
          },
        ]}
      >
        <OnboardingAcceptFooter
          agreeLabel={agreeLabel}
          continueLabel={continueLabel}
          checked={checked}
          onToggleCheck={() => setChecked((v) => !v)}
          onContinue={onAccept}
          loading={accepting}
          disabled={!canAccept || !document}
          hint={scrollHint}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressTrack: {
    paddingHorizontal: CONTENT_PAD,
    paddingBottom: 10,
    gap: 6,
  },
  progressBar: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: Platform.OS === "ios" ? "500" : "600",
  },
  legalScroll: { flex: 1 },
  scroll: {
    paddingHorizontal: CONTENT_PAD,
    gap: 14,
  },
  header: { alignItems: "center", gap: 8, marginBottom: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 12, fontWeight: "600" },
  title: { textAlign: "center", fontSize: 28, lineHeight: 34 },
  subtitle: { textAlign: "center", paddingHorizontal: 8 },
  legalRoot: { gap: 16 },
  metaCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  intro: { lineHeight: 24 },
  sectionWrap: { gap: 8 },
  sectionHeader: { paddingHorizontal: 4 },
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  paragraph: { lineHeight: 24, fontSize: 16 },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bulletDot: { lineHeight: 24, width: 12 },
  loadingWrap: { paddingVertical: 40, alignItems: "center", gap: 12 },
  errorCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  retryBtn: {
    alignSelf: "flex-start",
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footer: {
    paddingHorizontal: CONTENT_PAD,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerInner: { gap: 12, width: "100%" },
  footerHint: { textAlign: "center" },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkLabel: { flex: 1, lineHeight: 24 },
})
