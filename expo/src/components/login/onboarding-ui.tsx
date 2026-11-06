import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { LegalDocument } from "../../content/legal/types"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  authFlowCenterSlack,
  useOnboardingFlowLayout,
} from "../../lib/responsive-layout"
import type { AppSession } from "../../lib/session"
import {
  onboardingStepMeta,
  type OnboardingStepId,
} from "../../lib/onboarding"
import { LoginButton } from "./LoginButton"
import { useLoginTheme } from "./login-theme"
import { keyboardDismissScrollProps } from "../../lib/keyboard-dismiss-scroll-props"
import { motion, useAppReducedMotion, easing } from "../../lib/motion"
import { AuthFlowHeroEnter } from "../motion/AuthFlowPanelTransition"
import { PressableScale } from "../motion/PressableScale"

function OnboardingProgressFill({ progress, color }: { progress: number; color: string }) {
  const reduceMotion = useAppReducedMotion()
  const width = useSharedValue(progress)

  useEffect(() => {
    width.value = reduceMotion
      ? progress
      : withTiming(progress, { duration: motion.slow, easing: easing.emphasize })
  }, [progress, reduceMotion, width])

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, width.value)) * 100}%`,
  }))

  return <Animated.View style={[styles.progressFill, { backgroundColor: color }, animatedStyle]} />
}

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
  /** Tighter header spacing for short overview screens (welcome). */
  compact?: boolean
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
  compact = false,
}: OnboardingShellProps) {
  const insets = useSafeAreaInsets()
  const { LOGIN, loginType } = useLoginTheme()
  const { horizontalPadding, contentGap, shouldCenterVertically, contentStyle } = useOnboardingFlowLayout()
  const { stepIndex, totalSteps, progress } = onboardingStepMeta(session, stepId)
  const [scrollViewportH, setScrollViewportH] = useState(0)
  const [scrollContentH, setScrollContentH] = useState(0)
  const scrollSlack = authFlowCenterSlack({
    viewportH: scrollViewportH,
    contentH: scrollContentH,
    padTop: 0,
    padBottom: 0,
    shouldCenter: shouldCenterVertically,
  })

  const body = (
    <AuthFlowHeroEnter>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <View style={[styles.pill, { backgroundColor: LOGIN.soft, borderColor: LOGIN.softBorder }]}>
          <Ionicons name={icon} size={14} color={LOGIN.purple} />
          <Text style={[styles.pillText, { color: LOGIN.purple }]}>{pillLabel}</Text>
        </View>
        <Text style={[loginType.heroTitle, styles.title, compact && styles.titleCompact]}>{title}</Text>
        <Text style={[loginType.heroSubtitle, styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
      </View>
      {children}
    </AuthFlowHeroEnter>
  )

  return (
    <View style={[styles.root, { backgroundColor: LOGIN.canvas }]}>
      <View
        style={[
          styles.progressTrack,
          contentStyle,
          {
            paddingTop: insets.top + 14,
            paddingHorizontal: horizontalPadding,
            backgroundColor: LOGIN.canvas,
          },
        ]}
      >
        <View style={[styles.progressBar, { backgroundColor: LOGIN.separator }]}>
          <OnboardingProgressFill progress={progress} color={LOGIN.purple} />
        </View>
        <Text style={[styles.progressLabel, { color: LOGIN.secondaryLabel }]}>
          Step {stepIndex + 1} of {totalSteps}
        </Text>
      </View>

      {scrollable ? (
        <View
          style={[styles.scrollHost, contentStyle]}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height
            setScrollViewportH((prev) => (next > 0 && Math.abs(next - prev) > 1 ? next : prev))
          }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              compact ? styles.scrollContentCompact : styles.scrollContent,
              {
                paddingTop: scrollSlack,
                paddingBottom:
                  (footer ? Math.max(24, insets.bottom + 12) : insets.bottom + 28) + scrollSlack,
              },
            ]}
            {...keyboardDismissScrollProps}
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical
          >
            <View
              style={[
                styles.scroll,
                { paddingHorizontal: horizontalPadding, gap: compact ? 12 : contentGap },
              ]}
              onLayout={(event) => {
                const next = event.nativeEvent.layout.height
                setScrollContentH((prev) => (next > 0 && Math.abs(next - prev) > 1 ? next : prev))
              }}
            >
              {body}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View
          style={[
            styles.scrollHost,
            contentStyle,
            styles.scroll,
            {
              flex: 1,
              paddingHorizontal: horizontalPadding,
              gap: compact ? 12 : contentGap,
              justifyContent: shouldCenterVertically ? "center" : "flex-start",
            },
          ]}
        >
          {body}
        </View>
      )}

      {footer ? (
        <View
          style={[
            styles.footer,
            contentStyle,
            {
              paddingHorizontal: horizontalPadding,
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
  showTitle?: boolean
}

export function OnboardingLegalContent({
  document,
  loading,
  error,
  onRetry,
  source,
  showTitle = false,
}: OnboardingLegalContentProps) {
  const { LOGIN, loginType } = useLoginTheme()

  if (!document && loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={LOGIN.purple} />
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>Loading document…</Text>
      </View>
    )
  }

  if (!document) {
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
      {showTitle ? (
        <Text style={[loginType.heroTitle, styles.documentTitle, { color: LOGIN.label }]}>
          {document.title}
        </Text>
      ) : null}
      {loading ? (
        <View style={[styles.refreshBanner, { backgroundColor: LOGIN.soft, borderColor: LOGIN.softBorder }]}>
          <ActivityIndicator color={LOGIN.purple} size="small" />
          <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>Checking for updates…</Text>
        </View>
      ) : null}
      {error ? (
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel, paddingHorizontal: 4 }]}>
          {error} Showing the latest available copy.
        </Text>
      ) : null}
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
      <PressableScale
        style={[
          styles.checkRow,
          {
            backgroundColor: LOGIN.grouped,
            borderColor: checked ? LOGIN.purple : LOGIN.separator,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
        onPress={disabled ? undefined : onToggleCheck}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: Boolean(disabled) }}
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
      </PressableScale>
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
  documents,
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
  documents: readonly LegalDocument[]
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
  const { horizontalPadding, contentGap, contentStyle } = useOnboardingFlowLayout()
  const { stepIndex, totalSteps, progress } = onboardingStepMeta(session, stepId)
  const [checked, setChecked] = useState(false)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const documentsKey = documents.map((doc) => `${doc.id ?? doc.title}:${doc.updated}`).join("|")
  const stacked = documents.length > 1

  const scrollEndThreshold = 160
  const scrollBottomPad = 24
  const needsScroll = viewportHeight > 0 && contentHeight > viewportHeight + scrollEndThreshold
  const canAccept = !needsScroll || scrolledToEnd

  const evaluateScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
      const maxOffset = Math.max(0, contentSize.height - layoutMeasurement.height)
      if (maxOffset <= scrollEndThreshold) {
        setScrolledToEnd(true)
        return
      }
      if (contentOffset.y >= maxOffset - scrollEndThreshold || contentOffset.y >= maxOffset * 0.9) {
        setScrolledToEnd(true)
      }
    },
    [scrollEndThreshold],
  )

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      evaluateScrollEnd(event)
    },
    [evaluateScrollEnd],
  )

  const onContentSizeChange = useCallback((_w: number, h: number) => {
    setContentHeight(h)
  }, [])

  const onScrollViewportLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height)
  }, [])

  useEffect(() => {
    if (contentHeight <= 0 || viewportHeight <= 0) return
    if (contentHeight <= viewportHeight + scrollEndThreshold) {
      setScrolledToEnd(true)
    }
  }, [contentHeight, scrollEndThreshold, viewportHeight])

  useEffect(() => {
    setScrolledToEnd(false)
    setChecked(false)
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [stepId, documentsKey])

  const scrollHint = useMemo(() => {
    if (!canAccept && !loading) {
      return "Scroll to the end to enable acceptance."
    }
    return undefined
  }, [canAccept, loading])

  return (
    <View style={[styles.root, { backgroundColor: LOGIN.canvas }]}>
      <View
        style={[
          styles.progressTrack,
          contentStyle,
          {
            paddingTop: insets.top + 14,
            paddingHorizontal: horizontalPadding,
            backgroundColor: LOGIN.canvas,
          },
        ]}
      >
        <View style={[styles.progressBar, { backgroundColor: LOGIN.separator }]}>
          <OnboardingProgressFill progress={progress} color={LOGIN.purple} />
        </View>
        <Text style={[styles.progressLabel, { color: LOGIN.secondaryLabel }]}>
          Step {stepIndex + 1} of {totalSteps}
        </Text>
      </View>

      <View style={[styles.scrollHost, contentStyle]} onLayout={onScrollViewportLayout}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.legalScrollContent}
          scrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          alwaysBounceVertical
          onScroll={onScroll}
          onScrollEndDrag={evaluateScrollEnd}
          onMomentumScrollEnd={evaluateScrollEnd}
          scrollEventThrottle={16}
          onContentSizeChange={onContentSizeChange}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
          removeClippedSubviews={false}
        >
          <View
            style={[
              styles.scroll,
              {
                paddingHorizontal: horizontalPadding,
                gap: contentGap,
                paddingBottom: scrollBottomPad + insets.bottom,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.pill, { backgroundColor: LOGIN.soft, borderColor: LOGIN.softBorder }]}>
                <Ionicons name={icon} size={14} color={LOGIN.purple} />
                <Text style={[styles.pillText, { color: LOGIN.purple }]}>{pillLabel}</Text>
              </View>
              <Text style={[loginType.heroTitle, styles.title]}>{title}</Text>
              <Text style={[loginType.heroSubtitle, styles.subtitle]}>{subtitle}</Text>
            </View>

            {stacked ? (
              <View style={[styles.metaCard, { backgroundColor: LOGIN.fill, borderColor: LOGIN.separator }]}>
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>This agreement includes</Text>
                {documents.map((doc) => (
                  <Text key={doc.id ?? doc.title} style={[loginType.body, { color: LOGIN.label }]}>
                    • {doc.title}
                  </Text>
                ))}
              </View>
            ) : null}

            {documents.map((document, index) => (
              <OnboardingLegalContent
                key={document.id ?? document.title}
                document={document}
                showTitle={stacked}
                loading={index === 0 ? loading : false}
                error={index === 0 ? error : null}
                source={index === 0 ? source : "network"}
                onRetry={index === 0 ? onRetry : undefined}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View
        style={[
          styles.footer,
          contentStyle,
          {
            paddingHorizontal: horizontalPadding,
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
          disabled={!canAccept}
          hint={scrollHint}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressTrack: {
    paddingBottom: 12,
    gap: 8,
    flexShrink: 0,
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
  scrollHost: { flex: 1, minHeight: 0, alignSelf: "center", width: "100%" },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentCompact: {
    flexGrow: 0,
  },
  legalScrollContent: {
    flexGrow: 0,
  },
  scroll: {
    paddingTop: 10,
  },
  header: { alignItems: "center", gap: 10, marginBottom: 8, paddingTop: 4 },
  headerCompact: { gap: 6, marginBottom: 4, paddingTop: 0 },
  titleCompact: { fontSize: 28, lineHeight: 34 },
  subtitleCompact: { lineHeight: 22, paddingHorizontal: 0 },
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
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", paddingHorizontal: 0 },
  documentTitle: { fontSize: 22, lineHeight: 28, paddingHorizontal: 4 },
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
    padding: 14,
    gap: 10,
  },
  paragraph: { lineHeight: 24, fontSize: 16 },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bulletDot: { lineHeight: 24, width: 12 },
  loadingWrap: { paddingVertical: 40, alignItems: "center", gap: 12 },
  refreshBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
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
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
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
