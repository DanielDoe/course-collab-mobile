import { LinearGradient } from "expo-linear-gradient"
import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, G } from "react-native-svg"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import {
  gradeLetterStyle,
  gradePerformanceColor,
  gradePerformanceSoft,
  gradesHeroMutedInk,
  gradesProvisionalCallout,
  type GradeLens,
} from "../../lib/grades-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { GradeLensToggle } from "./GradeLensToggle"

const SIZE = 168
const RADIUS = 68
const STROKE = 11
const CIRC = 2 * Math.PI * RADIUS

function formatGaugePercent(value: number): string {
  const pct = Math.min(100, Math.max(0, value))
  return (Math.round(pct * 10) / 10).toFixed(1)
}

function gaugePercentTypography(text: string): { main: number; symbol: number } {
  if (text.length >= 5) return { main: 22, symbol: 11 }
  if (text.length >= 4) return { main: 26, symbol: 13 }
  return { main: 32, symbol: 15 }
}

type Props = {
  totalScore: number
  letterLabel: string
  gradeIsProvisional: boolean
  pendingCategories: string[]
  showGradeLens?: boolean
  gradeLens?: GradeLens
  onGradeLensChange?: (lens: GradeLens) => void
}


export function GradeHeroCard({
  totalScore,
  letterLabel,
  gradeIsProvisional,
  pendingCategories,
  showGradeLens = false,
  gradeLens = "pending",
  onGradeLensChange,
}: Props) {
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const heroMuted = gradesHeroMutedInk(tokens.isDark)
  const provisionalCallout = gradesProvisionalCallout(tokens.isDark)
  const pct = Math.min(100, Math.max(0, totalScore))
  const progress = (pct / 100) * CIRC
  const arc = gradePerformanceColor(pct)
  const letterStyle = gradeLetterStyle(letterLabel, totalScore)
  const isInProgress = /in progress/i.test(letterLabel.trim())
  const pctText = formatGaugePercent(totalScore)
  const { main: pctMainSize, symbol: pctSymbolSize } = gaugePercentTypography(pctText)
  const trackColor = SN.fill
  const gaugeFill = gradePerformanceSoft(pct, tokens.isDark ? 0.22 : 0.14)

  return (
    <LinearGradient
      colors={tokens.hero.gradientSoft}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: hexToRgba(arc, 0.22), borderWidth: StyleSheet.hairlineWidth }]}
    >
      <Text style={[type.sheetTitle, styles.eyebrow]}>
        {gradeIsProvisional ? "Grade so far" : "Overall grade"}
      </Text>
      <Text style={[type.secondary, styles.subtitle, { color: heroMuted }]}>
        {gradeIsProvisional
          ? "Based on completed categories — not your final course grade"
          : "Weighted total across all categories"}
      </Text>

      <View style={styles.gaugeWrap}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
          <Circle cx="100" cy="100" r="62" fill={gaugeFill} />
          <G transform="rotate(-90 100 100)">
            <Circle cx="100" cy="100" r={RADIUS} stroke={trackColor} strokeWidth={STROKE} fill="none" />
            <Circle
              cx="100"
              cy="100"
              r={RADIUS}
              stroke={arc}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${progress} ${CIRC}`}
              strokeLinecap="butt"
            />
          </G>
        </Svg>
        <View style={styles.gaugeCenter} pointerEvents="none">
          <View style={styles.pctRow}>
            <Text
              style={[styles.pct, { color: arc, fontSize: pctMainSize, maxWidth: 96 }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {pctText}
            </Text>
            <Text style={[styles.pctSymbol, { color: arc, fontSize: pctSymbolSize }]}>%</Text>
          </View>
          <Text style={[type.caption, styles.pctLabel, { color: heroMuted }]}>Weighted</Text>
        </View>
      </View>

      <View style={styles.letterRow}>
        <View
          style={[
            styles.letterBadge,
            isInProgress && styles.letterBadgePill,
            {
              borderColor: letterStyle.border,
              backgroundColor: letterStyle.background,
            },
          ]}
        >
          <Text
            style={[
              styles.letterText,
              isInProgress && styles.letterTextProvisional,
              { color: letterStyle.color },
            ]}
          >
            {letterLabel}
          </Text>
        </View>
        <Text style={[type.caption, styles.letterHint, { color: heroMuted }]}>Letter grade</Text>
      </View>

      {gradeIsProvisional ? (
        <View
          style={[
            styles.provisionalBox,
            {
              backgroundColor: provisionalCallout.background,
              borderColor: provisionalCallout.border,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={16} color={provisionalCallout.icon} />
          <Text style={[styles.provisionalText, { color: provisionalCallout.ink }]}>
            Provisional — some categories are still pending final scores.
          </Text>
        </View>
      ) : null}

      {showGradeLens && gradeIsProvisional && onGradeLensChange ? (
        <View style={styles.lensWrap}>
          <GradeLensToggle value={gradeLens} onChange={onGradeLensChange} />
        </View>
      ) : null}

      {pendingCategories.length > 0 ? (
        <View style={styles.pendingWrap}>
          <Text style={[type.sectionHeader, styles.pendingLabel, { color: heroMuted }]}>Pending categories</Text>
          {pendingCategories.map((item) => (
            <FacultyStatusPill key={item} label={item} tone="warning" />
          ))}
        </View>
      ) : null}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    padding: 20,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  eyebrow: {
    textAlign: "center",
  },
  subtitle: {
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  gaugeWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4},
  gaugeCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28},
  pctRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    maxWidth: "100%"},
  pct: {
    fontWeight: "600",
    letterSpacing: -0.5,
    lineHeight: undefined},
  pctSymbol: {
    fontWeight: "600",
    marginLeft: 1,
    opacity: 0.9},
  pctLabel: {
    fontWeight: "600",
    marginTop: 2,
  },
  letterRow: { alignItems: "center", gap: 4 },
  letterBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: 2,
  },
  letterBadgePill: {
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  letterText: { fontSize: 20, fontWeight: "600", letterSpacing: 0.5 },
  letterTextProvisional: { fontSize: 14, letterSpacing: 0, fontWeight: "700" },
  letterHint: { fontWeight: "600" },
  provisionalBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    alignSelf: "stretch",
  },
  provisionalText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  lensWrap: {
    alignSelf: "stretch",
  },
  pendingWrap: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  pendingLabel: { flexShrink: 0 },
})
