import { useEffect, useMemo, useState } from "react"
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppearance } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import {
  THEME_DEFINITIONS,
  appearancePickerThemeIds,
  resolveThemePreviewTokens,
  themeIsDarkFirst,
  type AppearanceMode,
  type ThemeId,
} from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import { LoginBackLink } from "./login-chrome"
import { persistAppearanceSetupComplete } from "../../lib/appearance-setup"
import { onboardingStepMeta } from "../../lib/onboarding"
import { authFlowContentMaxWidth, useAuthFlowContentStyle, useAuthFlowLayout } from "../../lib/responsive-layout"
import { LoginButton } from "./LoginButton"
import { useLoginTheme } from "./login-theme"

const THEME_GRID_GAP = 12
const THEME_COLUMNS = 2

const APPEARANCE_MODES: Array<{
  id: AppearanceMode
  label: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { id: "light", label: "Light", icon: "sunny-outline" },
  { id: "dark", label: "Dark", icon: "moon-outline" },
  { id: "system", label: "System", icon: "contrast-outline" },
]

const APPEARANCE_THEME_IDS = appearancePickerThemeIds()

function useOnboardingThemeCardWidth(contentMax: number, horizontalPad: number): number {
  const { width: windowWidth } = useWindowDimensions()
  return useMemo(() => {
    const canvas = Math.min(windowWidth, contentMax)
    const inner = canvas - horizontalPad * 2
    return Math.floor((inner - THEME_GRID_GAP * (THEME_COLUMNS - 1)) / THEME_COLUMNS)
  }, [contentMax, horizontalPad, windowWidth])
}

function AppearanceModeSegmented({
  value,
  onChange,
}: {
  value: AppearanceMode
  onChange: (mode: AppearanceMode) => void
}) {
  const { LOGIN } = useLoginTheme()

  return (
    <View
      style={[
        modeStyles.track,
        { backgroundColor: LOGIN.fill, borderColor: LOGIN.separator },
      ]}
    >
      {APPEARANCE_MODES.map((mode) => {
        const active = value === mode.id
        return (
          <Pressable
            key={mode.id}
            onPress={() => onChange(mode.id)}
            style={({ pressed }) => [
              modeStyles.segment,
              active && [
                modeStyles.segmentActive,
                {
                  backgroundColor: LOGIN.grouped,
                  borderColor: LOGIN.separator,
                },
              ],
              pressed && !active && { opacity: 0.82 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={mode.label}
          >
            <Ionicons
              name={mode.icon}
              size={16}
              color={active ? LOGIN.purple : LOGIN.secondaryLabel}
            />
            <Text
              style={[
                modeStyles.segmentLabel,
                { color: active ? LOGIN.label : LOGIN.secondaryLabel },
              ]}
              numberOfLines={1}
            >
              {mode.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function ThemePreviewCard({
  themeId,
  selected,
  onSelect,
  cardWidth,
  appearanceMode,
  systemScheme,
}: {
  themeId: ThemeId
  selected: boolean
  onSelect: () => void
  cardWidth: number
  appearanceMode: AppearanceMode
  systemScheme: "light" | "dark" | null
}) {
  const def = THEME_DEFINITIONS.find((t) => t.id === themeId)
  const previewTokens = useMemo(
    () => resolveThemePreviewTokens(themeId, appearanceMode, systemScheme),
    [themeId, appearanceMode, systemScheme],
  )
  if (!def) return null
  const darkFirst = themeIsDarkFirst(themeId)
  const palette = (previewTokens.chartPalette ?? [previewTokens.accent]).slice(0, 4)

  return (
    <Pressable
      style={[
        previewStyles.card,
        {
          width: cardWidth,
          backgroundColor: previewTokens.surface,
          borderColor: selected ? previewTokens.accent : previewTokens.border,
        },
        selected && previewStyles.cardSelected,
      ]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View
        style={[
          previewStyles.preview,
          {
            backgroundColor: previewTokens.backgroundGradient?.[0] ?? previewTokens.background,
          },
        ]}
      >
        <View style={[previewStyles.accentStripe, { backgroundColor: previewTokens.accent }]} />
        <View style={[previewStyles.toolbar, { backgroundColor: previewTokens.elevatedSurface, borderColor: previewTokens.border }]}>
          <View style={[previewStyles.toolbarDot, { backgroundColor: previewTokens.accent }]} />
          <View style={[previewStyles.toolbarLine, { backgroundColor: previewTokens.text, opacity: 0.45 }]} />
        </View>
        <View style={previewStyles.swatches}>
          {palette.map((color, index) => (
            <View
              key={`${color}-${index}`}
              style={[previewStyles.swatch, { backgroundColor: color }]}
            />
          ))}
        </View>
        <View
          style={[
            previewStyles.sampleBtn,
            {
              backgroundColor: previewTokens.accent,
              borderRadius: previewTokens.button.radius,
            },
          ]}
        />
      </View>
      <View style={previewStyles.footer}>
        <Text style={[previewStyles.name, { color: previewTokens.text }]} numberOfLines={2}>
          {def.name}
        </Text>
        {darkFirst ? (
          <View style={[previewStyles.darkBadge, { backgroundColor: previewTokens.accentSoftStrong }]}>
            <Text style={[previewStyles.darkBadgeText, { color: previewTokens.accent }]}>Dark</Text>
          </View>
        ) : null}
      </View>
      {selected ? (
        <View style={[previewStyles.check, { backgroundColor: previewTokens.accent }]}>
          <Ionicons name="checkmark" size={13} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  )
}

export function AppearanceSetupScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const systemScheme = useColorScheme()
  const { width: windowWidth } = useWindowDimensions()
  const { session, isLoading: sessionLoading } = useSession()
  const { ready, prefs, tokens, setAppearanceMode, setThemeId } = useAppearance()
  const { LOGIN, loginType } = useLoginTheme()
  const contentStyle = useAuthFlowContentStyle(520)
  const { horizontalPadding, contentGap } = useAuthFlowLayout({ phoneMax: 520 })
  const contentMax = useMemo(() => authFlowContentMaxWidth(windowWidth, 520), [windowWidth])
  const themeCardWidth = useOnboardingThemeCardWidth(contentMax, horizontalPadding)
  const [saving, setSaving] = useState(false)
  const progressMeta = useMemo(() => {
    if (!session || session.portal !== "student") {
      return { stepIndex: 0, totalSteps: 1, progress: 1 }
    }
    return onboardingStepMeta(session, "appearance")
  }, [session])

  const firstName = useMemo(() => {
    if (!session || session.portal !== "student") return null
    const name = session.name?.trim()
    if (!name) return null
    return name.split(/\s+/)[0]
  }, [session])

  useEffect(() => {
    if (sessionLoading) return
    if (!session) {
      router.replace("/login")
      return
    }
    if (session.portal !== "student") {
      router.replace("/dashboard")
    }
  }, [router, session, sessionLoading])

  async function finish() {
    if (!session || session.portal !== "student") {
      router.replace("/dashboard")
      return
    }
    setSaving(true)
    try {
      await persistAppearanceSetupComplete(session)
      router.replace("/dashboard")
    } catch {
      router.replace("/dashboard")
    } finally {
      setSaving(false)
    }
  }

  if (sessionLoading || !session || session.portal !== "student") {
    return null
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.native.groupedBackground }]}>
      <View
        style={[
          styles.progressTrack,
          contentStyle,
          { paddingTop: insets.top + 14, paddingHorizontal: horizontalPadding },
        ]}
      >
        <View style={[styles.progressBar, { backgroundColor: LOGIN.separator }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progressMeta.progress * 100)}%`, backgroundColor: LOGIN.purple },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: LOGIN.secondaryLabel }]}>
          Step {progressMeta.stepIndex + 1} of {progressMeta.totalSteps}
        </Text>
        {progressMeta.stepIndex > 0 ? (
          <LoginBackLink label="Back" onPress={() => router.back()} style={styles.appearanceBack} />
        ) : null}
      </View>

      <View style={[styles.scrollHost, contentStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          directionalLockEnabled
          alwaysBounceVertical
        >
          <View style={[styles.scroll, { paddingHorizontal: horizontalPadding, gap: contentGap }]}>
            <View style={styles.header}>
              <View style={[styles.pill, { backgroundColor: LOGIN.soft, borderColor: LOGIN.softBorder }]}>
                <Ionicons name="color-palette-outline" size={14} color={LOGIN.purple} />
                <Text style={[styles.pillText, { color: LOGIN.purple }]}>Personalize CourseCollab</Text>
              </View>
              <Text style={[loginType.heroTitle, styles.title]}>
                {firstName ? `Welcome, ${firstName}` : "Choose your look"}
              </Text>
              <Text style={[loginType.heroSubtitle, styles.subtitle]}>
                Pick a theme and light or dark mode. You can change these anytime in Settings → Appearance.
              </Text>
            </View>

            {!ready ? (
              <Text style={[loginType.info, styles.loadingCopy]}>Loading themes…</Text>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: LOGIN.secondaryLabel }]}>Appearance Mode</Text>
                  <AppearanceModeSegmented
                    value={prefs.appearanceMode}
                    onChange={setAppearanceMode}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: LOGIN.secondaryLabel }]}>Theme</Text>
                  <View style={styles.themeGrid}>
                    {APPEARANCE_THEME_IDS.map((id) => (
                      <ThemePreviewCard
                        key={id}
                        themeId={id}
                        selected={prefs.themeId === id}
                        onSelect={() => setThemeId(id)}
                        cardWidth={themeCardWidth}
                        appearanceMode={prefs.appearanceMode}
                        systemScheme={systemScheme ?? null}
                      />
                    ))}
                  </View>
                </View>

                <LoginButton
                  label="Continue to dashboard"
                  icon="arrow-forward"
                  onPress={() => void finish()}
                  loading={saving}
                />
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

const modeStyles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: NATIVE.sectionRadius - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  segmentActive: {
    ...Platform.select({
      ios: {
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
})

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
  appearanceBack: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  scrollHost: { flex: 1, minHeight: 0, width: "100%", alignSelf: "center" },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 0 },
  scroll: {
    paddingTop: 10,
  },
  header: { alignItems: "center", gap: 10, marginBottom: 4 },
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
  subtitle: { textAlign: "center", paddingHorizontal: 8 },
  loadingCopy: { textAlign: "center", marginTop: 24 },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: Platform.OS === "ios" ? "600" : "700",
    letterSpacing: 0.2,
    paddingHorizontal: 2,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME_GRID_GAP,
  },
})

const previewStyles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  cardSelected: {
    borderWidth: 2,
  },
  preview: {
    minHeight: 92,
    padding: 10,
    gap: 8,
    justifyContent: "flex-end",
  },
  accentStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  toolbarDot: { width: 7, height: 7, borderRadius: 3.5 },
  toolbarLine: { flex: 1, height: 4, borderRadius: 2 },
  swatches: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  swatch: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  sampleBtn: {
    height: 16,
    width: "48%",
    alignSelf: "flex-start",
  },
  footer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    minHeight: 52,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  darkBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  darkBadgeText: { fontSize: 10, fontWeight: "700" },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
})
