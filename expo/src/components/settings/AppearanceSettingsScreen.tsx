import { useMemo } from "react"
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppearance } from "../../context/AppearanceProvider"
import {
  THEME_DEFINITIONS,
  resolveThemePreviewTokens,
  themeIsDarkFirst,
  type AppearanceMode,
  type AppThemeTokens,
  type ThemeId,
} from "../../constants/app-themes"
import { useThemeGridCardWidth } from "../../lib/responsive-layout"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"

const APPEARANCE_MODES: Array<{ id: AppearanceMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "light", label: "Light", icon: "sunny-outline" },
  { id: "dark", label: "Dark", icon: "moon-outline" },
  { id: "system", label: "System", icon: "phone-portrait-outline" },
]

const CONTENT_PAD = 16
const THEME_GRID_GAP = 12

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
  const def = THEME_DEFINITIONS.find((t) => t.id === themeId)!
  const previewTokens = useMemo(
    () => resolveThemePreviewTokens(themeId, appearanceMode, systemScheme),
    [themeId, appearanceMode, systemScheme],
  )
  const darkFirst = themeIsDarkFirst(themeId)
  const glass = previewTokens.glass

  return (
    <Pressable
      style={[
        previewStyles.card,
        { width: cardWidth },
        {
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
        <View style={[previewStyles.glassBar, { backgroundColor: glass.surface, borderColor: glass.border }]}>
          <View style={[previewStyles.navDot, { backgroundColor: previewTokens.accent }]} />
          <View style={[previewStyles.navLine, { backgroundColor: previewTokens.text, width: 36, opacity: 0.7 }]} />
          <View style={[previewStyles.notifDot, { backgroundColor: previewTokens.danger }]} />
        </View>
        <View style={[previewStyles.kpiRow]}>
          <View style={[previewStyles.kpi, { backgroundColor: previewTokens.elevatedSurface, borderColor: previewTokens.border }]}>
            <Text style={[previewStyles.kpiValue, { color: previewTokens.text }]}>92</Text>
            <Text style={[previewStyles.kpiLabel, { color: previewTokens.textMuted }]}>KPI</Text>
          </View>
          <View style={[previewStyles.surfaceCard, { backgroundColor: previewTokens.surface, borderColor: previewTokens.border, flex: 1 }]}>
            <View style={[previewStyles.iconCircle, { backgroundColor: previewTokens.accentSoftStrong }]}>
              <Ionicons name="sparkles-outline" size={14} color={previewTokens.accent} />
            </View>
            <View style={previewStyles.cardLines}>
              <View style={[previewStyles.line, { backgroundColor: previewTokens.text, width: "70%" }]} />
              <View style={[previewStyles.line, { backgroundColor: previewTokens.textMuted, width: "45%" }]} />
            </View>
          </View>
        </View>
        <View style={previewStyles.chartRow}>
          {(previewTokens.chartPalette ?? [previewTokens.accent]).slice(0, 4).map((color, index) => (
            <View
              key={`${color}-${index}`}
              style={[previewStyles.bar, { backgroundColor: color, height: 10 + index * 4 }]}
            />
          ))}
        </View>
        <View style={[previewStyles.primaryBtn, { backgroundColor: previewTokens.accent, borderRadius: previewTokens.button.radius }]}>
          <Text style={previewStyles.primaryBtnText}>Button</Text>
        </View>
      </View>
      <View style={previewStyles.cardFooter}>
        <View style={previewStyles.titleRow}>
          <Text style={[previewStyles.themeName, { color: previewTokens.text }]}>{def.name}</Text>
          {def.isDefault ? <Text style={previewStyles.star}>★</Text> : null}
          {darkFirst ? (
            <View style={[previewStyles.darkBadge, { backgroundColor: previewTokens.accentSoftStrong }]}>
              <Text style={[previewStyles.darkBadgeText, { color: previewTokens.accent }]}>Dark</Text>
            </View>
          ) : null}
        </View>
        <Text style={[previewStyles.themeTagline, { color: previewTokens.textMuted }]} numberOfLines={1}>
          {def.tagline}
        </Text>
      </View>
      {selected ? (
        <View style={[previewStyles.check, { backgroundColor: previewTokens.accent }]}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  )
}

export function AppearanceSettingsContent({ compact = false }: { compact?: boolean }) {
  const systemScheme = useColorScheme()
  const { prefs, tokens, applying, setAppearanceMode, setThemeId } = useAppearance()
  const themeCardWidth = useThemeGridCardWidth(CONTENT_PAD, THEME_GRID_GAP)

  return (
    <>
      {!compact ? (
        <Text style={[styles.lead, { color: tokens.textSecondary }]}>
          Pick a theme for accent and surface style. Light and Dark adjust dual-mode themes only — dark-first themes
          (Carbon, Obsidian Glass, Midnight, Graphite Dark) always stay dark.
        </Text>
      ) : null}

      <Text style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
        {compact ? "Theme mode" : "APPEARANCE"}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: tokens.surface, borderColor: tokens.border }, tokens.cardShadow]}>
        <View style={styles.modeRow}>
          {APPEARANCE_MODES.map((mode) => {
            const active = prefs.appearanceMode === mode.id
            return (
              <Pressable
                key={mode.id}
                style={[styles.modeBtn, active && { backgroundColor: tokens.accentSoftStrong }]}
                onPress={() => setAppearanceMode(mode.id)}
                disabled={applying}
              >
                <Ionicons name={mode.icon} size={18} color={active ? tokens.accent : tokens.textMuted} />
                <Text
                  style={[styles.modeLabel, { color: active ? tokens.accent : tokens.textSecondary }]}
                  numberOfLines={1}
                >
                  {mode.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: tokens.textSecondary }]}>THEME</Text>
      <View style={styles.themeGrid}>
        {THEME_DEFINITIONS.map((def) => (
          <ThemePreviewCard
            key={def.id}
            themeId={def.id}
            selected={prefs.themeId === def.id}
            onSelect={() => setThemeId(def.id)}
            cardWidth={themeCardWidth}
            appearanceMode={prefs.appearanceMode}
            systemScheme={systemScheme ?? null}
          />
        ))}
      </View>

      <LivePreview tokens={tokens} />
    </>
  )
}

export function AppearanceSettingsScreen() {
  const insets = useSafeAreaInsets()
  const { tokens, applying } = useAppearance()

  return (
    <View style={[styles.root, { backgroundColor: tokens.native.groupedBackground }]}>
      <NotetakerScreenHeader title="Appearance" fallbackHref="/dashboard" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!applying}
        directionalLockEnabled={Platform.OS === "ios"}
        alwaysBounceVertical={false}
      >
        <AppearanceSettingsContent />
      </ScrollView>
    </View>
  )
}

function LivePreview({ tokens }: { tokens: AppThemeTokens }) {
  return (
    <View style={[styles.livePreview, { backgroundColor: tokens.surface, borderColor: tokens.border }, tokens.cardShadow]}>
      <Text style={[styles.liveTitle, { color: tokens.text }]}>Live preview</Text>
      <Text style={[styles.liveSub, { color: tokens.textSecondary }]}>
        {tokens.name} · {tokens.isDark ? "Dark" : "Light"} surfaces
      </Text>
      <View style={styles.liveRow}>
        <View style={[styles.chip, { backgroundColor: tokens.accentSoftStrong }]}>
          <Text style={[styles.chipText, { color: tokens.accent }]}>Selected chip</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: tokens.native.fill }]}>
          <Text style={[styles.chipText, { color: tokens.textSecondary }]}>Default chip</Text>
        </View>
      </View>
      <View style={styles.liveActions} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.livePrimary, { backgroundColor: tokens.accent }]}>
          <Text style={styles.livePrimaryText}>Primary</Text>
        </View>
        <View style={[styles.liveSecondary, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
          <Text style={[styles.liveSecondaryText, { color: tokens.text }]}>Secondary</Text>
        </View>
      </View>
    </View>
  )
}

const previewStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: THEME_GRID_GAP,
  },
  cardSelected: {
    ...Platform.select({
      ios: {
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  previewBg: {
    padding: 10,
    gap: 8,
    minHeight: 148,
  },
  glassBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kpiRow: { flexDirection: "row", gap: 6, alignItems: "stretch" },
  kpi: {
    width: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  kpiValue: { fontSize: 12, fontWeight: "700" },
  kpiLabel: { fontSize: 8, fontWeight: "600", marginTop: 2 },
  notifDot: { width: 6, height: 6, borderRadius: 3, marginLeft: "auto" },
  navDot: { width: 6, height: 6, borderRadius: 3 },
  navLine: { height: 4, borderRadius: 2, opacity: 0.85 },
  surfaceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLines: { flex: 1, gap: 5 },
  line: { height: 5, borderRadius: 3, opacity: 0.85 },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 24,
  },
  bar: { flex: 1, borderRadius: 4 },
  primaryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 10, fontWeight: "600" },
  cardFooter: { paddingHorizontal: 12, paddingVertical: 10, gap: 2, minHeight: 52 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 },
  themeName: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  star: { fontSize: 12, color: "#EAAA00" },
  darkBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, marginLeft: 2 },
  darkBadgeText: { fontSize: 10, fontWeight: "700" },
  themeTagline: { fontSize: 11 },
  check: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
})

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: CONTENT_PAD, paddingTop: 12, gap: 0 },
  lead: { fontSize: 14, lineHeight: 20, marginBottom: 20, marginTop: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: "row",
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 999,
    minWidth: 0,
  },
  modeLabel: { fontSize: 12, fontWeight: "600" },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME_GRID_GAP,
    marginBottom: 4,
  },
  livePreview: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  liveTitle: { fontSize: 16, fontWeight: "600" },
  liveSub: { fontSize: 13 },
  liveRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: "600" },
  liveActions: { flexDirection: "row", gap: 10 },
  livePrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  livePrimaryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  liveSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  liveSecondaryText: { fontWeight: "600", fontSize: 14 },
})
