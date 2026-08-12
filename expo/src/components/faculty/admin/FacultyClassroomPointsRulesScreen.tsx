import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View} from "react-native"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import { parseRewardsPolicy, type RewardsPolicy } from "../../../lib/course-policy-settings"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR, FACULTY_ADMIN_CHIP_RADIUS } from "../../../lib/faculty-admin-theme"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminToggleRow,
  FacultyAdminNumberField,
  useAdminSaveState,
  useAdminStyles} from "../faculty-admin-ui"

type RewardsForm = {
  show_code_assignments: boolean
  show_solution_assignments: boolean
  allow_student_submissions: boolean
  auto_approve_submissions: boolean
  auto_approve_practice_submissions: boolean
  duplicate_detection_enabled: boolean
  blur_leaderboard_peer_names: boolean
  points_for_full_grade: string
  max_daily_submission_points: string
}

type SubmissionPreset = "code" | "solution" | "both"

const SUBMISSION_PRESETS: Array<{ id: SubmissionPreset; label: string }> = [
  { id: "code", label: "Code only" },
  { id: "solution", label: "Solution only" },
  { id: "both", label: "Both" },
]

function policyToForm(policy: RewardsPolicy): RewardsForm {
  return {
    show_code_assignments: policy.show_code_assignments,
    show_solution_assignments: policy.show_solution_assignments,
    allow_student_submissions: policy.allow_student_submissions,
    auto_approve_submissions: policy.auto_approve_submissions,
    auto_approve_practice_submissions: policy.auto_approve_practice_submissions,
    duplicate_detection_enabled: policy.duplicate_detection_enabled,
    blur_leaderboard_peer_names: policy.blur_leaderboard_peer_names,
    points_for_full_grade: String(policy.points_for_full_grade),
    max_daily_submission_points: String(policy.max_daily_submission_points)}
}

function formToPolicy(form: RewardsForm): RewardsPolicy {
  return parseRewardsPolicy({
    show_code_assignments: form.show_code_assignments,
    show_solution_assignments: form.show_solution_assignments,
    allow_student_submissions: form.allow_student_submissions,
    auto_approve_submissions: form.auto_approve_submissions,
    auto_approve_practice_submissions: form.auto_approve_practice_submissions,
    duplicate_detection_enabled: form.duplicate_detection_enabled,
    blur_leaderboard_peer_names: form.blur_leaderboard_peer_names,
    points_for_full_grade: Number(form.points_for_full_grade),
    max_daily_submission_points: Number(form.max_daily_submission_points)})
}

function activePreset(form: RewardsForm | null): SubmissionPreset {
  if (!form) return "both"
  if (form.show_code_assignments && form.show_solution_assignments) return "both"
  if (form.show_code_assignments) return "code"
  if (form.show_solution_assignments) return "solution"
  return "both"
}

export function FacultyClassroomPointsRulesScreen() {
  return (
    <FacultyAdminCourseGate>
      <FacultyClassroomPointsRulesContent />
    </FacultyAdminCourseGate>
  )
}

function FacultyClassroomPointsRulesContent() {
  const { scope } = useFacultyScope()
  const {
    dirty,
    saving,
    error,
    successMessage,
    markDirty,
    resetDirty,
    setError,
    clearError,
    runSave,
    showSuccess} = useAdminSaveState()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [form, setForm] = useState<RewardsForm | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    clearError()
    try {
      const data = await instructorAdminApi.getCoursePolicies(scope)
      setForm(policyToForm(parseRewardsPolicy(data.rewards_policy)))
      resetDirty()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load classroom points rules.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [scope, clearError, resetDirty, setError])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void load()
  }, [load])

  const patchForm = useCallback(
    (patch: Partial<RewardsForm>) => {
      setForm((prev) => (prev ? { ...prev, ...patch } : prev))
      markDirty()
    },
    [markDirty],
  )

  const applyPreset = useCallback(
    (preset: SubmissionPreset) => {
      if (preset === "code") {
        patchForm({ show_code_assignments: true, show_solution_assignments: false })
      } else if (preset === "solution") {
        patchForm({ show_code_assignments: false, show_solution_assignments: true })
      } else {
        patchForm({ show_code_assignments: true, show_solution_assignments: true })
      }
    },
    [patchForm],
  )

  const handleSave = useCallback(() => {
    if (!scope || !form) return
    void runSave(async () => {
      const rewards_policy = formToPolicy(form)
      await instructorAdminApi.patchCoursePolicies(scope, { rewards_policy })
      setForm(policyToForm(rewards_policy))
    })
  }, [scope, form, runSave])

  const handleBackfill = useCallback(async () => {
    if (!scope || backfilling) return
    clearError()
    setBackfilling(true)
    try {
      const result = await instructorAdminApi.bulkClassroomAiEvaluate(scope, 25)
      const evaluated = result.summary?.evaluated ?? 0
      const skipped = result.summary?.skipped ?? 0
      const errors = result.summary?.errors ?? 0
      showSuccess(
        result.message ??
          `Backfill complete — ${evaluated} evaluated, ${skipped} skipped, ${errors} errors.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI feedback backfill failed.")
    } finally {
      setBackfilling(false)
    }
  }, [scope, backfilling, clearError, setError, showSuccess])

  const preset = activePreset(form)

  const adminStyles = useAdminStyles()
  const { native, type } = adminStyles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        presetRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
          backgroundColor: native.secondaryGrouped,
        },
        presetChip: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: FACULTY_ADMIN_CHIP_RADIUS,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        presetChipActive: {
          backgroundColor: `${FACULTY_ADMIN_COLOR.link}18`,
          borderColor: FACULTY_ADMIN_COLOR.link,
        },
        presetChipText: { ...type.callout, fontWeight: "600", color: native.secondaryLabel },
        presetChipTextActive: { color: FACULTY_ADMIN_COLOR.link },
        backfillBtn: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: NATIVE.sectionRadius,
          paddingVertical: 14,
          minHeight: 48,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.secondaryGrouped,
        },
        backfillBtnDisabled: { opacity: 0.55 },
        backfillBtnText: { ...type.bodyEmphasis, color: FACULTY_ADMIN_COLOR.link },
      }),
    [native, type],
  )

  return (
    <FacultyAdminScreen
      title="Classroom Points Rules"
      loading={loading}
      saving={saving}
      refreshing={refreshing}
      error={error || null}
      dirty={dirty}
      successMessage={successMessage}
      onSave={handleSave}
      onRefresh={onRefresh}
      footerExtra={
        <Pressable
          style={[styles.backfillBtn, backfilling && styles.backfillBtnDisabled]}
          onPress={() => void handleBackfill()}
          disabled={backfilling || loading}
          accessibilityRole="button"
          accessibilityLabel="Run AI feedback backfill"
        >
          {backfilling ? (
            <ActivityIndicator size="small" color={FACULTY_ADMIN_COLOR.link} />
          ) : (
            <Text style={styles.backfillBtnText}>Run AI Feedback Backfill</Text>
          )}
        </Pressable>
      }
    >
      <FacultyAdminSection
        title="Student Submission Blocks"
        footer="Choose which assignment types appear on the student classroom points page."
      >
        <View style={styles.presetRow}>
          {SUBMISSION_PRESETS.map(({ id, label }) => {
            const active = preset === id
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [
                  styles.presetChip,
                  active && styles.presetChipActive,
                  pressed && { opacity: NATIVE.pressedOpacity },
                ]}
                android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                onPress={() => applyPreset(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <FacultyAdminToggleRow
          label="Show Code Assignments"
          value={form?.show_code_assignments ?? false}
          onChange={(next) => patchForm({ show_code_assignments: next })}
        />
        <FacultyAdminToggleRow
          label="Show Solution Assignments"
          value={form?.show_solution_assignments ?? false}
          onChange={(next) => patchForm({ show_solution_assignments: next })}
        />
      </FacultyAdminSection>

      <FacultyAdminSection title="Submissions & Approval">
        <FacultyAdminToggleRow
          label="Allow Student Submissions"
          value={form?.allow_student_submissions ?? false}
          onChange={(next) => patchForm({ allow_student_submissions: next })}
        />
        <FacultyAdminToggleRow
          label="Auto-Approve Submissions"
          subtitle="Classroom code/solution submissions receive AI feedback then credit immediately."
          value={form?.auto_approve_submissions ?? false}
          onChange={(next) => patchForm({ auto_approve_submissions: next })}
        />
        <FacultyAdminToggleRow
          label="Auto-Approve Practice Submissions"
          subtitle="Practice Hub uploads receive AI feedback then credit immediately."
          value={form?.auto_approve_practice_submissions ?? false}
          onChange={(next) => patchForm({ auto_approve_practice_submissions: next })}
        />
        <FacultyAdminToggleRow
          label="Duplicate Detection"
          subtitle="Flag likely duplicate submissions for review."
          value={form?.duplicate_detection_enabled ?? false}
          onChange={(next) => patchForm({ duplicate_detection_enabled: next })}
        />
      </FacultyAdminSection>

      <FacultyAdminSection title="Points & Privacy">
        <FacultyAdminNumberField
          label="Points for Full Grade"
          value={form?.points_for_full_grade ?? ""}
          onChangeText={(text) => patchForm({ points_for_full_grade: text })}
        />
        <FacultyAdminNumberField
          label="Max Daily Submission Points"
          value={form?.max_daily_submission_points ?? ""}
          onChangeText={(text) => patchForm({ max_daily_submission_points: text })}
        />
        <FacultyAdminToggleRow
          label="Blur Leaderboard Peer Names"
          subtitle="Hide peer names and points on student leaderboards for privacy."
          value={form?.blur_leaderboard_peer_names ?? false}
          onChange={(next) => patchForm({ blur_leaderboard_peer_names: next })}
        />
      </FacultyAdminSection>
    </FacultyAdminScreen>
  )
}
