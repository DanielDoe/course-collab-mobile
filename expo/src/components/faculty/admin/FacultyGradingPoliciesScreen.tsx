import { useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import {
  instructorAdminApi,
  type GradeWeightsView,
  type GradingPolicyResponse} from "../../../lib/instructor-admin-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import {
  FacultyAdminCourseGate,
  FacultyAdminNumberField,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminToggleRow,
  useAdminSaveState,
  useAdminStyles} from "../faculty-admin-ui"

type WeightKey = keyof Omit<GradeWeightsView, "total">

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
    engagement: strNum(weights.engagement)}
}

function sumWeights(values: Record<WeightKey, string>) {
  return WEIGHT_FIELDS.reduce((sum, field) => sum + parseWeight(values[field.key], 0), 0)
}

export function FacultyGradingPoliciesScreen() {
  const { scope, ready } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, runSave, showSuccess, setError } =
    useAdminSaveState()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [grading, setGrading] = useState<GradingPolicyResponse | null>(null)
  const [graceDays, setGraceDays] = useState("0")
  const [multiplier, setMultiplier] = useState("1")
  const [weights, setWeights] = useState<Record<WeightKey, string>>(weightsToStrings({
    quiz: 0,
    homework: 0,
    midterm: 0,
    final: 0,
    attendance: 0,
    project: 0,
    classroom: 0,
    engagement: 0,
    total: 0}))

  const weightTotal = useMemo(() => sumWeights(weights), [weights])

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
    void runSave(async () => {
      await instructorAdminApi.patchGradingPolicy(scope, {
        assessment_perks_grace_days_after_deadline: parseWeight(graceDays, 0),
        multi_part_upload_multiplier: parseWeight(multiplier, 1)})
      await instructorAdminApi.saveGradeWeights(scope, {
        session: "ALL",
        quizWeight: parseWeight(weights.quiz, 0),
        homeworkWeight: parseWeight(weights.homework, 0),
        midtermWeight: parseWeight(weights.midterm, 0),
        finalWeight: parseWeight(weights.final, 0),
        attendanceWeight: parseWeight(weights.attendance, 0),
        projectWeight: parseWeight(weights.project, 0),
        classroomWeight: parseWeight(weights.classroom, 0),
        engagementWeight: parseWeight(weights.engagement, 0)})
      await load()
    })
  }

  const adminStyles = useAdminStyles()
  const { native, tokens, type } = adminStyles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        totalRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingVertical: 14,
          backgroundColor: native.secondaryGrouped,
        },
        totalLabel: { ...type.bodyEmphasis, color: native.label },
        totalValue: {
          ...type.bodyEmphasis,
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
        <FacultyAdminSection title="Automation">
          <FacultyAdminToggleRow
            label="Auto-Finalize Perfect Scores"
            subtitle="Immediately finalize submissions scored at 100%."
            value={grading?.auto_finalize_perfect_scores ?? false}
            onChange={(next) => void handleAutoFinalizeToggle(next)}
          />
        </FacultyAdminSection>

        <FacultyAdminSection title="Deadlines & Uploads">
          <FacultyAdminNumberField
            label="Grace Days After Deadline"
            value={graceDays}
            suffix="days"
            onChangeText={(text) => {
              setGraceDays(text)
              markDirty()
            }}
          />
          <FacultyAdminNumberField
            label="Multi-Part Upload Multiplier"
            value={multiplier}
            onChangeText={(text) => {
              setMultiplier(text)
              markDirty()
            }}
          />
        </FacultyAdminSection>

        <FacultyAdminSection
          title="Grade Weights (All Sessions)"
          footer="Weights should total 100. Adjust each category for the course gradebook."
        >
          {WEIGHT_FIELDS.map((field) => (
            <FacultyAdminNumberField
              key={field.key}
              label={field.label}
              value={weights[field.key]}
              suffix="%"
              onChangeText={(text) => updateWeight(field.key, text)}
            />
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, weightTotal !== 100 && styles.totalWarn]}>{weightTotal.toFixed(1)}%</Text>
          </View>
        </FacultyAdminSection>
      </FacultyAdminScreen>
    </FacultyAdminCourseGate>
  )
}
