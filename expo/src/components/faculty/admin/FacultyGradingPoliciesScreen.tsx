import { useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import {
  instructorAdminApi,
  type GradeWeightsView,
  type GradingPolicyResponse,
} from "../../../lib/instructor-admin-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { semanticSoft } from "../../../lib/themed-module-theme"
import { FacultyModuleTabBar } from "../faculty-module-shell"
import {
  FacultyAdminCourseGate,
  FacultyAdminChoiceField,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminToggleRow,
  useAdminSaveState,
  useAdminStyles,
} from "../faculty-admin-ui"
import { DAY_COUNT_OPTIONS, MULTIPLIER_OPTIONS, WEIGHT_PERCENT_OPTIONS } from "../FacultyNativePickers"

type WeightKey = keyof Omit<GradeWeightsView, "total">
type PolicyTab = "automation" | "deadlines" | "weights"

const TABS: Array<{ id: PolicyTab; label: string }> = [
  { id: "automation", label: "Automation" },
  { id: "deadlines", label: "Deadlines" },
  { id: "weights", label: "Weights" },
]

const WEIGHT_FIELDS: Array<{ key: WeightKey; label: string }> = [
  { key: "quiz", label: "Quiz" },
  { key: "homework", label: "Homework" },
  { key: "midterm", label: "Midterm" },
  { key: "final", label: "Final" },
  { key: "attendance", label: "Attendance" },
  { key: "project", label: "Project" },
  { key: "classroom", label: "Classroom" },
  { key: "engagement", label: "Engagement" },
]

function strNum(n: number) {
  return String(n)
}

function parseWeight(text: string, fallback: number) {
  const n = parseFloat(text)
  return Number.isFinite(n) ? n : fallback
}

function weightsToStrings(weights: GradeWeightsView): Record<WeightKey, string> {
  return {
    quiz: strNum(weights.quiz),
    homework: strNum(weights.homework),
    midterm: strNum(weights.midterm),
    final: strNum(weights.final),
    attendance: strNum(weights.attendance),
    project: strNum(weights.project),
    classroom: strNum(weights.classroom),
    engagement: strNum(weights.engagement),
  }
}

function sumWeights(values: Record<WeightKey, string>) {
  return WEIGHT_FIELDS.reduce((sum, field) => sum + parseWeight(values[field.key], 0), 0)
}

export function FacultyGradingPoliciesScreen() {
  const { scope, ready } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, runSave, showSuccess, setError } =
    useAdminSaveState()

  const [tab, setTab] = useState<PolicyTab>("automation")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [grading, setGrading] = useState<GradingPolicyResponse | null>(null)
  const [graceDays, setGraceDays] = useState("0")
  const [multiplier, setMultiplier] = useState("1")
  const [weights, setWeights] = useState<Record<WeightKey, string>>(
    weightsToStrings({
      quiz: 0,
      homework: 0,
      midterm: 0,
      final: 0,
      attendance: 0,
      project: 0,
      classroom: 0,
      engagement: 0,
      total: 0,
    }),
  )

  const weightTotal = useMemo(() => sumWeights(weights), [weights])
  const weightsBalanced = Math.abs(weightTotal - 100) < 0.05

  const load = useCallback(async () => {
    if (!scope) return
    const [policy, gradeWeights] = await Promise.all([
      instructorAdminApi.getGradingPolicy(scope),
      instructorAdminApi.getGradeWeights(scope, "ALL"),
    ])
    setGrading(policy)
    setGraceDays(strNum(policy.assessment_perks_grace_days_after_deadline))
    setMultiplier(strNum(policy.multi_part_upload_multiplier))
    setWeights(weightsToStrings(gradeWeights))
    resetDirty()
  }, [scope, resetDirty])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [ready, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  async function handleAutoFinalizeToggle(next: boolean) {
    if (!scope) return
    setGrading((prev) => (prev ? { ...prev, auto_finalize_perfect_scores: next } : prev))
    try {
      await instructorAdminApi.patchGradingPolicy(scope, { auto_finalize_perfect_scores: next })
      showSuccess("Auto-finalize updated")
    } catch (err) {
      setGrading((prev) => (prev ? { ...prev, auto_finalize_perfect_scores: !next } : prev))
      setError(err instanceof Error ? err.message : "Could not update auto-finalize.")
    }
  }

  function updateWeight(key: WeightKey, text: string) {
    setWeights((prev) => ({ ...prev, [key]: text }))
    markDirty()
  }

  function handleSave() {
    if (!scope) return
    if (!weightsBalanced) {
      setError("Grade weights must total 100% before saving.")
      return
    }
    void runSave(async () => {
      await instructorAdminApi.patchGradingPolicy(scope, {
        assessment_perks_grace_days_after_deadline: parseWeight(graceDays, 0),
        multi_part_upload_multiplier: parseWeight(multiplier, 1),
      })
      await instructorAdminApi.saveGradeWeights(scope, {
        session: "ALL",
        quizWeight: parseWeight(weights.quiz, 0),
        homeworkWeight: parseWeight(weights.homework, 0),
        midtermWeight: parseWeight(weights.midterm, 0),
        finalWeight: parseWeight(weights.final, 0),
        attendanceWeight: parseWeight(weights.attendance, 0),
        projectWeight: parseWeight(weights.project, 0),
        classroomWeight: parseWeight(weights.classroom, 0),
        engagementWeight: parseWeight(weights.engagement, 0),
      })
      await load()
    })
  }

  const adminStyles = useAdminStyles()
  const { native, tokens, type } = adminStyles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        balanceBanner: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderRadius: NATIVE.sectionRadius,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: StyleSheet.hairlineWidth,
        },
        balanceCopy: { flex: 1, gap: 2 },
        balanceTitle: { ...type.bodyEmphasis, color: native.label },
        balanceBody: { ...type.caption, lineHeight: 17 },
        totalRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: NATIVE.rowMinHeight,
          paddingHorizontal: 14,
          paddingVertical: 11,
          backgroundColor: native.secondaryGrouped,
        },
        totalLabel: { ...type.bodyEmphasis, color: native.label },
        totalValue: {
          ...type.bodyEmphasis,
          fontSize: 17,
          fontVariant: ["tabular-nums"],
          color: FACULTY_ADMIN_COLOR.link,
        },
        totalWarn: { color: tokens.danger },
      }),
    [native, tokens, type],
  )

  return (
    <FacultyAdminCourseGate>
      <FacultyAdminScreen
        loading={loading}
        saving={saving}
        refreshing={refreshing}
        error={error}
        dirty={dirty}
        successMessage={successMessage}
        onSave={handleSave}
        onRefresh={() => void handleRefresh()}
      >
        <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} scrollable />

        {tab === "automation" ? (
          <FacultyAdminSection
            title="Automation"
            footer="Perfect-score submissions finalize immediately without manual review."
          >
            <FacultyAdminToggleRow
              label="Auto-Finalize Perfect Scores"
              subtitle="Immediately finalize submissions scored at 100%."
              value={grading?.auto_finalize_perfect_scores ?? false}
              onChange={(next) => void handleAutoFinalizeToggle(next)}
            />
          </FacultyAdminSection>
        ) : null}

        {tab === "deadlines" ? (
          <FacultyAdminSection
            title="Deadlines & Uploads"
            footer="Grace days extend late submission perks. The upload multiplier scales multi-part file limits."
          >
            <FacultyAdminChoiceField
              label="Grace Days After Deadline"
              value={graceDays}
              options={DAY_COUNT_OPTIONS}
              onChange={(text) => {
                setGraceDays(text)
                markDirty()
              }}
            />
            <FacultyAdminChoiceField
              label="Multi-Part Upload Multiplier"
              value={multiplier}
              options={MULTIPLIER_OPTIONS}
              onChange={(text) => {
                setMultiplier(text)
                markDirty()
              }}
            />
          </FacultyAdminSection>
        ) : null}

        {tab === "weights" ? (
          <>
            <View
              style={[
                styles.balanceBanner,
                {
                  backgroundColor: semanticSoft(weightsBalanced ? tokens.success : tokens.warning, tokens.isDark),
                  borderColor: `${weightsBalanced ? tokens.success : tokens.warning}33`,
                },
              ]}
            >
              <View style={styles.balanceCopy}>
                <Text style={styles.balanceTitle}>
                  {weightsBalanced ? "Weights total 100%" : "Weights need adjustment"}
                </Text>
                <Text style={[styles.balanceBody, { color: native.secondaryLabel }]}>
                  {weightsBalanced
                    ? "Course gradebook categories are balanced for this course."
                    : `Current total is ${weightTotal.toFixed(1)}%. Adjust categories until they sum to 100%.`}
                </Text>
              </View>
            </View>

            <FacultyAdminSection
              title="Grade Weights"
              footer="Applies to this course. Each category contributes to the course gradebook total."
            >
              {WEIGHT_FIELDS.map((field) => (
                <FacultyAdminChoiceField
                  key={field.key}
                  label={field.label}
                  value={weights[field.key]}
                  options={WEIGHT_PERCENT_OPTIONS}
                  onChange={(text) => updateWeight(field.key, text)}
                />
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[styles.totalValue, !weightsBalanced && styles.totalWarn]}>
                  {weightTotal.toFixed(1)}%
                </Text>
              </View>
            </FacultyAdminSection>
          </>
        ) : null}
      </FacultyAdminScreen>
    </FacultyAdminCourseGate>
  )
}
