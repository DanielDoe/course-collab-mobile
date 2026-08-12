import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { Ionicons as IoniconsType } from "@expo/vector-icons"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { ApiError, studentApi } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  buildGradeCategories,
  compareToClass,
  formatCategoryScore,
  resolveGradeDisplay,
  toNumber,
  type GradeCategoryView,
  type StudentGradesResponse,
} from "../../lib/grades-api"
import {
  GRADES_COMPARE_ABOVE,
  GRADES_COMPARE_BELOW,
  GRADES_CONTRIBUTION_TOTAL,
  gradePerformanceColor,
  gradePerformanceSoft,
  gradeScorePillStyle,
  gradesCategoryAccent,
  gradesCategoryThumb,
} from "../../lib/grades-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { GradeHeroCard } from "./GradeHeroCard"
import { GradeCategoryBreakdownSheet } from "./GradeCategoryBreakdownSheet"
import { ModuleSection, ModuleSectionHeader } from "../modules/ModuleScreen"
import { FacultyStatusPill } from "../faculty/faculty-shared"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function CategoryCard({
  category,
  onPress,
}: {
  category: GradeCategoryView
  onPress: () => void
}) {
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const categoryAccent = gradesCategoryAccent(category.key)
  const thumb = gradesCategoryThumb(category.key, category.pending)
  const performanceScore = category.isEngagement ? category.contribution * 10 : category.score
  const scorePill = category.pending
    ? { background: hexToRgba(tokens.warning, tokens.isDark ? 0.24 : 0.16), color: tokens.warning }
    : gradeScorePillStyle(performanceScore, tokens.isDark)
  const comparison = compareToClass(category.score, category.classAverage)

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: SN.fill }}
      style={({ pressed }) => [styles.categoryRow, pressed && styles.categoryRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${category.label}, ${formatCategoryScore(category)}. View contributing assessments.`}
    >
      <View style={styles.categoryHead}>
        <SolidListThumbTile
          thumb={thumb}
          icon={category.icon as keyof typeof IoniconsType.glyphMap}
          size="compact"
          style={styles.categoryIconTile}
        />
        <View style={styles.categoryCopy}>
          <Text style={[type.bodyEmphasis, styles.categoryLabel]}>{category.label}</Text>
          <Text style={[type.secondary, styles.categoryWeight, { color: SN.secondaryLabel }]}>
            {Math.round(category.weight)}% of course weight
          </Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: scorePill.background }]}>
          <Text style={[styles.scorePillText, { color: scorePill.color }]}>
            {formatCategoryScore(category)}
          </Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: hexToRgba(categoryAccent, 0.18) }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(100, category.pending ? 0 : category.isEngagement ? category.score : category.score)}%`,
              backgroundColor: category.pending ? tokens.textMuted : categoryAccent,
            },
          ]}
        />
      </View>

      <View style={styles.categoryMeta}>
        <View style={styles.metaItem}>
          <Text style={[type.secondary, styles.metaLabel, { color: SN.secondaryLabel }]}>Contribution</Text>
          <Text style={[type.callout, styles.metaValue, { fontWeight: "600", fontSize: 13, color: categoryAccent }]}>
            {category.pending ? "—" : `+${category.contribution.toFixed(2)}%`}
          </Text>
        </View>
        {category.classAverage > 0 ? (
          <View style={styles.metaItem}>
            <Text style={[type.secondary, styles.metaLabel, { color: SN.secondaryLabel }]}>Class avg</Text>
            <View style={styles.classAvgRow}>
              <Text style={[type.callout, styles.metaValue, { fontWeight: "600", fontSize: 13 }]}>
                {category.classAverage.toFixed(1)}%
              </Text>
              {comparison === "above" ? (
                <Ionicons name="arrow-up" size={12} color={GRADES_COMPARE_ABOVE} />
              ) : comparison === "below" ? (
                <Ionicons name="arrow-down" size={12} color={GRADES_COMPARE_BELOW} />
              ) : null}
            </View>
          </View>
        ) : null}
        {category.pending ? (
          <FacultyStatusPill label="Pending" tone="warning" />
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} style={styles.categoryChevron} />
      </View>
    </Pressable>
  )
}

export function GradesScreen() {
  const session = useStudentSession()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [payload, setPayload] = useState<StudentGradesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<GradeCategoryView | null>(null)
  const [gradeLens, setGradeLens] = useState<"pending" | "final">("pending")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await studentApi.getGrades(session)
      setPayload(data)
    } catch (err) {
      setPayload(null)
      setError(err instanceof ApiError ? err.message : "Failed to load grades.")
    }
  }, [session])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh(["grades", "assessments"], onRefresh)

  const display = useMemo(() => (payload ? resolveGradeDisplay(payload) : null), [payload])

  const heroDisplay = useMemo(() => {
    if (!display || !payload) return null
    if (!display.gradeIsProvisional || gradeLens === "pending") {
      return {
        totalScore: display.totalScore,
        letterLabel: display.letterLabel,
        gradeIsProvisional: display.gradeIsProvisional,
        pendingCategories: display.pendingCategories,
        showGradeLens: display.gradeIsProvisional,
      }
    }

    const grade = payload.grade ?? {}
    const finalTotal = toNumber(grade.total_score)
    const finalLetter = grade.letter_grade?.trim()
    return {
      totalScore: finalTotal,
      letterLabel: finalLetter || "—",
      gradeIsProvisional: display.gradeIsProvisional,
      pendingCategories: display.pendingCategories,
      showGradeLens: true,
    }
  }, [display, gradeLens, payload])

  const categories = useMemo(() => {
    if (!payload) return []
    return buildGradeCategories(payload).filter(
      (cat) => cat.weight > 0 || cat.score > 0 || cat.contribution > 0 || cat.pending,
    )
  }, [payload])

  const contributions = useMemo(
    () => categories.filter((cat) => cat.contribution > 0 && !cat.pending),
    [categories],
  )

  if (loading && !payload) {
    return <ModuleScreen loading>{null}</ModuleScreen>
  }

  if (!payload || !display || !heroDisplay) {
    return (
      <ModuleScreen error={error || "Grades unavailable."}>
        <Pressable style={[styles.retryBtn, { backgroundColor: SN.accentSoft }]} onPress={() => void onRefresh()}>
          <Text style={[styles.retryText, { color: SN.accent }]}>Try again</Text>
        </Pressable>
      </ModuleScreen>
    )
  }

  return (
    <ModuleScreen loading={false} refreshing={refreshing} onRefresh={onRefresh} error={error}>
      <GradeHeroCard
        totalScore={heroDisplay.totalScore}
        letterLabel={heroDisplay.letterLabel}
        gradeIsProvisional={heroDisplay.gradeIsProvisional}
        pendingCategories={heroDisplay.pendingCategories}
        showGradeLens={heroDisplay.showGradeLens}
        gradeLens={gradeLens}
        onGradeLensChange={setGradeLens}
      />

      {payload.grade?.notes ? (
        <View style={[styles.notesBox, { backgroundColor: SN.secondaryGrouped }]}>
          <Ionicons name="document-text-outline" size={16} color={SN.accent} />
          <Text style={[type.caption, styles.notesText]}>{String(payload.grade.notes)}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <ModuleSectionHeader title="Category breakdown" />
        <Text style={[type.secondary, styles.sectionSub, { color: SN.secondaryLabel }]}>
          Scores, weights, and how each category contributes to your total.
        </Text>
        {categories.length === 0 ? (
          <Text style={[type.caption, styles.emptyCategories]}>No graded categories yet.</Text>
        ) : (
          <ModuleSection>
            {categories.map((category, index) => (
              <View
                key={category.key}
                style={
                  index < categories.length - 1
                    ? [styles.categoryRowBorder, { borderBottomColor: SN.separator }]
                    : undefined
                }
              >
                <CategoryCard category={category} onPress={() => setSelectedCategory(category)} />
              </View>
            ))}
          </ModuleSection>
        )}
      </View>

      <GradeCategoryBreakdownSheet
        visible={selectedCategory != null}
        category={selectedCategory}
        session={session}
        onClose={() => setSelectedCategory(null)}
      />

      {contributions.length > 0 ? (
        <View style={styles.section}>
          <ModuleSectionHeader title="Contribution summary" />
          <ModuleSection>
            {contributions.map((cat, index) => (
              <View
                key={cat.key}
                style={[
                  styles.contribRow,
                  index < contributions.length - 1 && [styles.contribRowBorder, { borderBottomColor: SN.separator }],
                ]}
              >
                <View style={[styles.contribDot, { backgroundColor: gradesCategoryAccent(cat.key) }]} />
                <Text style={[type.callout, styles.contribLabel, { fontWeight: "600" }]}>{cat.label}</Text>
                <Text style={[styles.contribValue, { color: gradesCategoryAccent(cat.key) }]}>{cat.contribution.toFixed(2)}%</Text>
              </View>
            ))}
            <View style={[styles.contribTotalRow, { borderTopColor: SN.separator }]}>
              <Text style={[type.footnote, styles.contribTotalLabel]}>Recorded total</Text>
              <Text style={[styles.contribTotalValue, { color: GRADES_CONTRIBUTION_TOTAL }]}>{display.totalScore.toFixed(2)}%</Text>
            </View>
          </ModuleSection>
        </View>
      ) : null}

      {payload.grade?.is_locked ? (
        <View style={[styles.lockedBox, { backgroundColor: SN.accentSoft }]}>
          <Ionicons name="lock-closed-outline" size={16} color={SN.accent} />
          <Text style={[type.caption, styles.lockedText, { fontWeight: "600" }]}>
            Your gradebook is locked by your instructor.
          </Text>
        </View>
      ) : null}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  retryBtn: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  retryText: { fontSize: 14, fontWeight: "600" },
  notesBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  notesText: { flex: 1, lineHeight: 19 },
  section: { gap: 8 },
  sectionSub: { marginTop: -4, lineHeight: 17 },
  emptyCategories: { textAlign: "center", paddingVertical: 20 },
  categoryRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  categoryRowPressed: { opacity: 0.88 },
  categoryChevron: { marginLeft: "auto" },
  categoryRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryIconTile: {
    width: NATIVE.iconTileSize,
    height: NATIVE.iconTileSize,
    borderRadius: NATIVE.iconTileRadius,
  },
  categoryCopy: { flex: 1, gap: 2 },
  categoryLabel: {},
  categoryWeight: {},
  scorePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  scorePillText: { fontSize: 13, fontWeight: "600" },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  categoryMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  metaItem: { gap: 2 },
  metaLabel: {},
  metaValue: {},
  classAvgRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  contribRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contribRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contribDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contribLabel: { flex: 1 },
  contribValue: { fontSize: 13, fontWeight: "600" },
  contribTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  contribTotalLabel: {},
  contribTotalValue: { fontSize: 18, fontWeight: "600" },
  lockedBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  lockedText: { flex: 1 },
})
