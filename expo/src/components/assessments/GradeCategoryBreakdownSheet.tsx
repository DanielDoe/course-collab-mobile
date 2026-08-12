import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import type { StudentSession } from "../../lib/session"
import {
  compareToClass,
  formatCategoryScore,
  type GradeCategoryView,
} from "../../lib/grades-api"
import {
  fetchGradeCategoryBreakdown,
  type GradeBreakdownItem,
} from "../../lib/grades-category-breakdown"
import {
  gradePerformanceColor,
  gradePerformanceSoft,
  gradesCategoryAccent,
  gradesCategoryThumb,
} from "../../lib/grades-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import {
  FacultySheetChrome,
  FacultySheetContainer,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  useCollabSheetStyles,
} from "../faculty/faculty-collab-sheet-ui"
import { openAssessmentResults, openHistoryItem } from "./assessment-navigation"
import { studentApi, type AssessmentHistoryItem } from "../../lib/student-api"
import { ApiError } from "../../lib/student-api"

type Props = {
  visible: boolean
  category: GradeCategoryView | null
  session: StudentSession | null
  onClose: () => void
}

function statusToneForPill(tone?: GradeBreakdownItem["statusTone"]): "success" | "neutral" | "live" | "warning" {
  if (tone === "success") return "success"
  if (tone === "live") return "live"
  if (tone === "warning") return "warning"
  return "neutral"
}

function BreakdownRow({
  item,
  accent,
  isLast,
  onPress,
}: {
  item: GradeBreakdownItem
  accent: string
  isLast?: boolean
  onPress?: () => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const scoreValue =
    item.valueLabel?.endsWith("%")
      ? Number.parseFloat(item.valueLabel.replace("%", ""))
      : null
  const performanceColor =
    scoreValue != null && Number.isFinite(scoreValue) ? gradePerformanceColor(scoreValue) : accent
  const valuePillBg =
    scoreValue != null && Number.isFinite(scoreValue)
      ? gradePerformanceSoft(scoreValue, 0.2)
      : hexToRgba(accent, 0.18)

  const content = (
    <View
      style={[
        styles.row,
        { backgroundColor: native.secondaryGrouped },
        !isLast && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={styles.rowCopy}>
        <Text style={[type.bodyEmphasis, styles.rowTitle]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text style={[type.caption, styles.rowSubtitle]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
        {item.statusLabel ? (
          <FacultyStatusPill label={item.statusLabel} tone={statusToneForPill(item.statusTone)} />
        ) : null}
      </View>
      <View style={styles.rowTrailing}>
        {item.valueLabel ? (
          <View style={[styles.valuePill, { backgroundColor: valuePillBg }]}>
            <Text style={[styles.valueText, { color: performanceColor }]}>{item.valueLabel}</Text>
          </View>
        ) : null}
        {onPress ? <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} /> : null}
      </View>
    </View>
  )

  if (!onPress) return content

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: native.fill }}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
    >
      {content}
    </Pressable>
  )
}

export function GradeCategoryBreakdownSheet({ visible, category, session, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const [items, setItems] = useState<GradeBreakdownItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session || !category) return
    setLoading(true)
    setError("")
    try {
      const data = await fetchGradeCategoryBreakdown(session, category.key)
      setItems(data)
    } catch (err) {
      setItems([])
      setError(err instanceof ApiError ? err.message : "Failed to load breakdown.")
    } finally {
      setLoading(false)
    }
  }, [session, category])

  useEffect(() => {
    if (!visible || !category || !session) return
    void load()
  }, [visible, category, session, load])

  const accent = category ? gradesCategoryAccent(category.key) : tokens.accent
  const thumb = category ? gradesCategoryThumb(category.key, category.pending) : gradesCategoryThumb("quiz", false)
  const comparison = category ? compareToClass(category.score, category.classAverage) : "none"

  const handleItemPress = useCallback(
    async (item: GradeBreakdownItem) => {
      if (!session) return

      if (item.attemptId && item.assessmentType) {
        openAssessmentResults(router, item.attemptId, item.assessmentType)
        onClose()
        return
      }

      if (item.assessmentId && item.assessmentType) {
        try {
          const history = await studentApi.getAssessmentHistory(session)
          const list = history.history ?? history.assessmentHistory ?? []
          const match = list.find((row) => row.id === item.assessmentId)
          if (match) {
            openHistoryItem(router, match as AssessmentHistoryItem)
            onClose()
            return
          }
        } catch {
          /* fall through */
        }
      }

      if (item.classroomPointId) {
        router.push(`/rewards/classroom-point/${item.classroomPointId}` as never)
        onClose()
        return
      }

      if (item.projectId) {
        router.push(`/collaboration/projects/${item.projectId}` as never)
        onClose()
      }
    },
    [session, router, onClose],
  )

  const emptyCopy = useMemo(() => {
    if (!category) return "No items yet."
    if (category.pending) return "This category is still pending. Check back after your instructor posts scores."
    switch (category.key) {
      case "attendance":
        return "No attendance sessions recorded yet."
      case "classroom":
        return "No classroom point awards yet."
      case "engagement":
        return "No engagement credit activity recorded yet."
      case "project":
        return "No project submissions linked to your grade yet."
      default:
        return "No assessments found for this category yet."
    }
  }, [category])

  if (!category) return null

  const performanceScore = category.isEngagement ? category.contribution * 10 : category.score
  const scoreColor = category.pending ? tokens.textMuted : gradePerformanceColor(performanceScore)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title={category.label} onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={formatCategoryScore(category)}
            subtitle={`${Math.round(category.weight)}% course weight · +${category.pending ? "—" : category.contribution.toFixed(2)}% contribution`}
            icon={category.icon as keyof typeof Ionicons.glyphMap}
            pills={
              <>
                {category.pending ? <FacultyStatusPill label="Pending" tone="warning" onDark /> : null}
                {!category.pending && category.classAverage > 0 ? (
                  <FacultyStatusPill
                    label={`Class avg ${category.classAverage.toFixed(1)}%${
                      comparison === "above" ? " · above" : comparison === "below" ? " · below" : ""
                    }`}
                    tone={comparison === "above" ? "success" : comparison === "below" ? "warning" : "neutral"}
                    onDark
                  />
                ) : null}
              </>
            }
          />

          <FacultySheetSection label="Category summary" hint="Aggregated from the items below">
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon="analytics-outline" label="Category score" value={formatCategoryScore(category)} />
              <FacultySheetMetricRow
                icon="pie-chart-outline"
                label="Weight"
                value={`${Math.round(category.weight)}%`}
              />
              <FacultySheetMetricRow
                icon="add-circle-outline"
                label="Contribution to total"
                value={category.pending ? "Pending" : `+${category.contribution.toFixed(2)}%`}
                isLast
              />
            </FacultySheetGroupedList>
          </FacultySheetSection>

          <FacultySheetSection
            label="Contributing items"
            hint={
              category.isEngagement
                ? "Credits and activities that feed this category"
                : "Assessments and records included in this score"
            }
          >
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={accent} />
                <Text style={[type.caption, { color: tokens.textMuted }]}>Loading items…</Text>
              </View>
            ) : error ? (
              <View style={[styles.emptyBox, { backgroundColor: native.secondaryGrouped }]}>
                <Text style={[type.caption, { color: tokens.danger }]}>{error}</Text>
                <Pressable onPress={() => void load()} style={[styles.retryBtn, { backgroundColor: hexToRgba(accent, 0.18) }]}>
                  <Text style={[type.callout, { color: accent, fontWeight: "600" }]}>Try again</Text>
                </Pressable>
              </View>
            ) : items.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: native.secondaryGrouped }]}>
                <SolidListThumbTile thumb={thumb} icon={category.icon as keyof typeof Ionicons.glyphMap} size="compact" />
                <Text style={[type.body, styles.emptyText]}>{emptyCopy}</Text>
              </View>
            ) : (
              <FacultySheetGroupedList>
                {items.map((item, index) => {
                  const pressable =
                    Boolean(item.attemptId || item.assessmentId || item.classroomPointId || item.projectId)
                  return (
                    <BreakdownRow
                      key={item.id}
                      item={item}
                      accent={accent}
                      isLast={index === items.length - 1}
                      onPress={pressable ? () => void handleItemPress(item) : undefined}
                    />
                  )
                })}
              </FacultySheetGroupedList>
            )}
          </FacultySheetSection>

          {!category.pending && items.length > 0 ? (
            <View style={[styles.footerNote, { backgroundColor: native.secondaryGrouped }]}>
              <Ionicons name="information-circle-outline" size={16} color={scoreColor} />
              <Text style={[type.caption, styles.footerText]}>
                {category.isEngagement
                  ? "Engagement credits are capped at 100 and converted into your course grade using the category weight."
                  : "Your category score is calculated from the assessments and records listed above."}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  loadingBox: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
  },
  emptyBox: {
    alignItems: "center",
    gap: 10,
    padding: 20,
    borderRadius: NATIVE.sectionRadius,
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  rowTitle: {
    lineHeight: 20,
  },
  rowSubtitle: {},
  rowTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  valuePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  valueText: {
    fontSize: 13,
    fontWeight: "600",
  },
  footerNote: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  footerText: {
    flex: 1,
    lineHeight: 18,
  },
})
