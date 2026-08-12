import { useEffect, useMemo, useState } from "react"
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppearance } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import {
  THEME_DEFINITIONS,
  resolveThemePreviewTokens,
  themeIsDarkFirst,
  type AppearanceMode,
  type ThemeId,
} from "../../constants/app-themes"
import { persistAppearanceSetupComplete } from "../../lib/appearance-setup"
import { useThemeGridCardWidth } from "../../lib/responsive-layout"
import { LoginButton } from "./LoginButton"
import { useLoginTheme } from "./login-theme"

const APPEARANCE_MODES: Array<{
  id: AppearanceMode
  label: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { id: "light", label: "Light", icon: "sunny-outline" },
  { id: "dark", label: "Dark", icon: "moon-outline" },
  { id: "system", label: "System", icon: "phone-portrait-outline" },
]

/** Curated onboarding set — university themes first, then core looks (mirrors web auth/theme). */
const ONBOARDING_THEME_IDS: ThemeId[] = [
  "cougar-crimson",
  "university-of-houston-steel",
  "pvamu-purple",
  "pvamu-gold",
  "apple-lavender",
  "ocean",
  "emerald",
  "midnight",
  "professional-crimson",
  "executive-navy",
  "liquid-glass",
  "frost",
  "graphite",
  "aurora",
  "meridian-teal",
  "obsidian-glass",
  "heritage-wine",
  "copper-luxe",
]

const CONTENT_PAD = 20
const THEME_GRID_GAP = 10

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
          previewStyles.previewBg,
          {
            backgroundColor: previewTokens.backgroundGradient?.[0] ?? previewTokens.background,
          },
        ]}
      >
        <View style={[previewStyles.accentBar, { backgroundColor: previewTokens.accent }]} />
        <View style={[previewStyles.surfaceChip, { backgroundColor: previewTokens.surface }]}>
          <View style={[previewStyles.dot, { backgroundColor: previewTokens.accent }]} />
          <View style={[previewStyles.line, { backgroundColor: previewTokens.text, opacity: 0.55 }]} />
        </View>
        <View
          style={[
            previewStyles.miniBtn,
            {
              backgroundColor: previewTokens.accent,
              borderRadius: previewTokens.button.radius,
            },
          ]}
        />
      </View>
      <View style={previewStyles.footer}>
        <Text style={[previewStyles.name, { color: previewTokens.text }]} numberOfLines={1}>
          {def.name}
        </Text>
        {darkFirst ? (
          <Text style={[previewStyles.badge, { color: previewTokens.accent }]}>Dark</Text>
        ) : null}
      </View>
      {selected ? (
        <View style={[previewStyles.check, { backgroundColor: previewTokens.accent }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  )
}

export function AppearanceSetupScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const systemScheme = useColorScheme()
  const { session } = useSession()
  const { ready, prefs, tokens, setAppearanceMode, setThemeId } = useAppearance()
  const { LOGIN, loginType } = useLoginTheme()
  const themeCardWidth = useThemeGridCardWidth(CONTENT_PAD, THEME_GRID_GAP)
  const [saving, setSaving] = useState(false)

  const firstName = useMemo(() => {
    if (!session || session.portal !== "student") return null
    const name = session.name?.trim()
    if (!name) return null
    return name.split(/\s+/)[0]
  }, [session])

  useEffect(() => {
    if (!session) {
      router.replace("/login")
      return
    }
    if (session.portal !== "student") {
      router.replace("/dashboard")
    }
  }, [router, session])

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

  if (!session || session.portal !== "student") {
    return null
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.native.groupedBackground }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 28,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={[loginType.info, { textAlign: "center", marginTop: 24 }]}>Loading themes…</Text>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: LOGIN.secondaryLabel }]}>Appearance Mode</Text>
            <View style={styles.modeRow}>
              {APPEARANCE_MODES.map((mode) => {
                const active = prefs.appearanceMode === mode.id
                return (
                  <Pressable
                    key={mode.id}
                    onPress={() => setAppearanceMode(mode.id)}
                    style={({ pressed }) => [
                      styles.modeBtn,
                      {
                        borderColor: active ? LOGIN.purple : LOGIN.separator,
                        backgroundColor: active ? LOGIN.soft : LOGIN.grouped,
                      },
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons
                      name={mode.icon}
                      size={18}
                      color={active ? LOGIN.purple : LOGIN.secondaryLabel}
                    />
                    <Text
                      style={[
                        styles.modeLabel,
                        { color: active ? LOGIN.purple : LOGIN.secondaryLabel },
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={[styles.sectionLabel, { color: LOGIN.secondaryLabel, marginTop: 8 }]}>
              Theme
            </Text>
            <View style={styles.themeGrid}>
              {ONBOARDING_THEME_IDS.map((id) => (
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

            <LoginButton
              label="Continue to dashboard"
              icon="arrow-forward"
              onPress={() => void finish()}
              loading={saving}
            />
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: CONTENT_PAD,
    gap: 14,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: Platform.OS === "ios" ? "600" : "700",
    letterSpacing: 0.2,
  },
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  modeLabel: { fontSize: 13, fontWeight: "600" },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME_GRID_GAP,
  },
  pressed: { opacity: 0.86 },
})

const previewStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  cardSelected: {
    borderWidth: 2,
  },
  previewBg: {
    height: 88,
    padding: 10,
    gap: 8,
    justifyContent: "flex-end",
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  surfaceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { flex: 1, height: 4, borderRadius: 2 },
  miniBtn: { height: 18, width: "55%", alignSelf: "flex-start" },
  footer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: { flex: 1, fontSize: 13, fontWeight: "600" },
  badge: { fontSize: 10, fontWeight: "700" },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
})
