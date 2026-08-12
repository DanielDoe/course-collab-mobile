import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import type { InstructorSession } from "../../../lib/instructor-api"
import {
  parsePlaygroundPolicy,
  type PlaygroundPolicy} from "../../../lib/playground-policy-settings"
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

type PlaygroundForm = {
  blur_leaderboard_peer_names: boolean
  default_question_count: string
  default_duration_sec: string
  min_duration_sec: string
  max_duration_sec: string
  max_questions_per_session: string
  points_per_correct_max: string
  points_per_correct_min: string
  speed_bonus_window_ms: string
  allow_student_nicknames: boolean
  show_accuracy_on_leaderboard: boolean
  require_session_restriction: boolean
  default_allowed_session_ids: number[]
  max_concurrent_live_sessions: string
  sync_engagement_points: boolean
}

function policyToForm(policy: PlaygroundPolicy): PlaygroundForm {
  return {
    blur_leaderboard_peer_names: policy.blur_leaderboard_peer_names,
    default_question_count: String(policy.default_question_count),
    default_duration_sec: String(policy.default_duration_sec),
    min_duration_sec: String(policy.min_duration_sec),
    max_duration_sec: String(policy.max_duration_sec),
    max_questions_per_session: String(policy.max_questions_per_session),
    points_per_correct_max: String(policy.points_per_correct_max),
    points_per_correct_min: String(policy.points_per_correct_min),
    speed_bonus_window_ms: String(policy.speed_bonus_window_ms),
    allow_student_nicknames: policy.allow_student_nicknames,
    show_accuracy_on_leaderboard: policy.show_accuracy_on_leaderboard,
    require_session_restriction: policy.require_session_restriction,
    default_allowed_session_ids: [...policy.default_allowed_session_ids],
    max_concurrent_live_sessions: String(policy.max_concurrent_live_sessions),
    sync_engagement_points: policy.sync_engagement_points}
}

function formToPolicy(form: PlaygroundForm): PlaygroundPolicy {
  return parsePlaygroundPolicy({
    blur_leaderboard_peer_names: form.blur_leaderboard_peer_names,
    default_question_count: Number(form.default_question_count),
    default_duration_sec: Number(form.default_duration_sec),
    min_duration_sec: Number(form.min_duration_sec),
    max_duration_sec: Number(form.max_duration_sec),
    max_questions_per_session: Number(form.max_questions_per_session),
    points_per_correct_max: Number(form.points_per_correct_max),
    points_per_correct_min: Number(form.points_per_correct_min),
    speed_bonus_window_ms: Number(form.speed_bonus_window_ms),
    allow_student_nicknames: form.allow_student_nicknames,
    show_accuracy_on_leaderboard: form.show_accuracy_on_leaderboard,
    require_session_restriction: form.require_session_restriction,
    default_allowed_session_ids: form.default_allowed_session_ids,
    max_concurrent_live_sessions: Number(form.max_concurrent_live_sessions),
    sync_engagement_points: form.sync_engagement_points})
}

export function FacultyPlaygroundRulesScreen() {
  return (
    <FacultyAdminCourseGate>
      <FacultyPlaygroundRulesContent />
    </FacultyAdminCourseGate>
  )
}

function FacultyPlaygroundRulesContent() {
  const { scope } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, setError, clearError, runSave } =
    useAdminSaveState()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState<PlaygroundForm | null>(null)
  const [sections, setSections] = useState<InstructorSession[]>([])

  const load = useCallback(async () => {
    if (!scope) return
    clearError()
    try {
      const [policies, sessionList] = await Promise.all([
        instructorAdminApi.getCoursePolicies(scope),
        instructorAdminApi.getPlaygroundSections(scope),
      ])
      setForm(policyToForm(parsePlaygroundPolicy(policies.playground_policy)))
      setSections(sessionList)
      resetDirty()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load playground rules.")
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
    (patch: Partial<PlaygroundForm>) => {
      setForm((prev) => (prev ? { ...prev, ...patch } : prev))
      markDirty()
    },
    [markDirty],
  )

  const toggleSection = useCallback(
    (sessionId: number) => {
      setForm((prev) => {
        if (!prev) return prev
        const ids = prev.default_allowed_session_ids
        const next = ids.includes(sessionId)
          ? ids.filter((id) => id !== sessionId)
          : [...ids, sessionId]
        return { ...prev, default_allowed_session_ids: next }
      })
      markDirty()
    },
    [markDirty],
  )

  const handleSave = useCallback(() => {
    if (!scope || !form) return
    void runSave(async () => {
      const playground_policy = formToPolicy(form)
      await instructorAdminApi.patchCoursePolicies(scope, { playground_policy })
      setForm(policyToForm(playground_policy))
    })
  }, [scope, form, runSave])

  const adminStyles = useAdminStyles()
  const { native, type } = adminStyles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        chipRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
          backgroundColor: native.secondaryGrouped,
        },
        sectionChip: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: FACULTY_ADMIN_CHIP_RADIUS,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        sectionChipActive: {
          backgroundColor: `${FACULTY_ADMIN_COLOR.link}18`,
          borderColor: FACULTY_ADMIN_COLOR.link,
        },
        sectionChipText: { ...type.callout, fontWeight: "600", color: native.secondaryLabel },
        sectionChipTextActive: { color: FACULTY_ADMIN_COLOR.link },
        emptySections: {
          paddingHorizontal: 14,
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
          backgroundColor: native.secondaryGrouped,
        },
        emptySectionsText: { ...type.secondary, fontSize: 15, color: native.secondaryLabel },
      }),
    [native, type],
  )

  return (
    <FacultyAdminScreen
      loading={loading}
      saving={saving}
      refreshing={refreshing}
      error={error || null}
      dirty={dirty}
      successMessage={successMessage}
      onSave={handleSave}
      onRefresh={onRefresh}
    >
      <FacultyAdminSection title="Session Defaults">
        <FacultyAdminNumberField
          label="Default Question Count"
          value={form?.default_question_count ?? ""}
          onChangeText={(text) => patchForm({ default_question_count: text })}
        />
        <FacultyAdminNumberField
          label="Default Duration"
          value={form?.default_duration_sec ?? ""}
          onChangeText={(text) => patchForm({ default_duration_sec: text })}
          suffix="sec"
        />
        <FacultyAdminNumberField
          label="Min Duration"
          value={form?.min_duration_sec ?? ""}
          onChangeText={(text) => patchForm({ min_duration_sec: text })}
          suffix="sec"
        />
        <FacultyAdminNumberField
          label="Max Duration"
          value={form?.max_duration_sec ?? ""}
          onChangeText={(text) => patchForm({ max_duration_sec: text })}
          suffix="sec"
        />
        <FacultyAdminNumberField
          label="Max Questions per Session"
          value={form?.max_questions_per_session ?? ""}
          onChangeText={(text) => patchForm({ max_questions_per_session: text })}
        />
        <FacultyAdminNumberField
          label="Max Concurrent Live Sessions"
          value={form?.max_concurrent_live_sessions ?? ""}
          onChangeText={(text) => patchForm({ max_concurrent_live_sessions: text })}
        />
      </FacultyAdminSection>

      <FacultyAdminSection title="Scoring">
        <FacultyAdminNumberField
          label="Points per Correct (Max)"
          value={form?.points_per_correct_max ?? ""}
          onChangeText={(text) => patchForm({ points_per_correct_max: text })}
        />
        <FacultyAdminNumberField
          label="Points per Correct (Min)"
          value={form?.points_per_correct_min ?? ""}
          onChangeText={(text) => patchForm({ points_per_correct_min: text })}
        />
        <FacultyAdminNumberField
          label="Speed Bonus Window"
          value={form?.speed_bonus_window_ms ?? ""}
          onChangeText={(text) => patchForm({ speed_bonus_window_ms: text })}
          suffix="ms"
        />
        <FacultyAdminToggleRow
          label="Sync Engagement Points"
          subtitle="Award engagement points when playground sessions complete."
          value={form?.sync_engagement_points ?? false}
          onChange={(next) => patchForm({ sync_engagement_points: next })}
        />
      </FacultyAdminSection>

      <FacultyAdminSection
        title="Default Allowed Sections"
        footer="Pre-selected sections when starting a session. Leave empty to allow all sections."
      >
        {sections.length === 0 ? (
          <View style={styles.emptySections}>
            <Text style={styles.emptySectionsText}>No class sections found for this course.</Text>
          </View>
        ) : (
          <View style={styles.chipRow}>
            {sections.map((section) => {
              const selected = form?.default_allowed_session_ids.includes(section.id) ?? false
              const label = section.code || `Section ${section.id}`
              return (
                <Pressable
                  key={section.id}
                  style={({ pressed }) => [
                    styles.sectionChip,
                    selected && styles.sectionChipActive,
                    pressed && { opacity: NATIVE.pressedOpacity },
                  ]}
                  android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                  onPress={() => toggleSection(section.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.sectionChipText, selected && styles.sectionChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        )}
        <FacultyAdminToggleRow
          label="Require Session Restriction"
          subtitle="Instructors must pick class sections; empty selection blocks start."
          value={form?.require_session_restriction ?? false}
          onChange={(next) => patchForm({ require_session_restriction: next })}
        />
      </FacultyAdminSection>

      <FacultyAdminSection title="Student Experience">
        <FacultyAdminToggleRow
          label="Allow Student Nicknames"
          value={form?.allow_student_nicknames ?? false}
          onChange={(next) => patchForm({ allow_student_nicknames: next })}
        />
        <FacultyAdminToggleRow
          label="Show Accuracy on Leaderboard"
          value={form?.show_accuracy_on_leaderboard ?? false}
          onChange={(next) => patchForm({ show_accuracy_on_leaderboard: next })}
        />
        <FacultyAdminToggleRow
          label="Blur Leaderboard Peer Names"
          subtitle="Hide peer names and scores on student leaderboards for privacy."
          value={form?.blur_leaderboard_peer_names ?? false}
          onChange={(next) => patchForm({ blur_leaderboard_peer_names: next })}
        />
      </FacultyAdminSection>
    </FacultyAdminScreen>
  )
}
