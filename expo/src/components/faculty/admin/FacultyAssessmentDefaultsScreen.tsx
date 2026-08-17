import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, StyleSheet, Text } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import {
  DEFAULT_ASSESSMENT_POLICY,
  type AiEvaluationModeDefault,
  type AssessmentPolicy,
  type RetakePolicyDefault,
  type SectionTimerMode,
  parseAssessmentPolicy} from "../../../lib/assessment-policy-settings"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { FacultyModuleTabBar } from "../faculty-module-shell"
import {
  FacultyAdminCourseGate,
  FacultyAdminChoiceField,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminSelectRow,
  FacultyAdminTextField,
  FacultyAdminToggleRow,
  useAdminSaveState,
  useAdminStyles} from "../faculty-admin-ui"
import { AdminOptionPickerModal, type AdminOption } from "./admin-option-picker"
import {
  CONFIDENCE_THRESHOLD_OPTIONS,
  GEO_RADIUS_OPTIONS,
  RETAKE_LIMIT_OPTIONS,
  STRIKE_COUNT_OPTIONS,
  secondsSelectOptions,
} from "../FacultyNativePickers"

type PolicyTab = "timing" | "sections" | "retakes" | "integrity" | "access_ai"

const TABS: Array<{ id: PolicyTab; label: string }> = [
  { id: "timing", label: "Timing" },
  { id: "sections", label: "Sections" },
  { id: "retakes", label: "Retakes" },
  { id: "integrity", label: "Integrity" },
  { id: "access_ai", label: "Access & AI" },
]

const TIMER_MODE_OPTIONS: AdminOption<SectionTimerMode>[] = [
  { value: "per_question", label: "Per Question" },
  { value: "section_timer", label: "Section Timer" },
]

const RETAKE_POLICY_OPTIONS: AdminOption<RetakePolicyDefault>[] = [
  { value: "best", label: "Best Score" },
  { value: "latest", label: "Latest Attempt" },
  { value: "average", label: "Average" },
]

const AI_MODE_OPTIONS: AdminOption<AiEvaluationModeDefault>[] = [
  { value: "relaxed", label: "Relaxed" },
  { value: "standard", label: "Standard" },
  { value: "strict", label: "Strict" },
  { value: "very_strict", label: "Very Strict" },
]

type PickerState =
  | { kind: "timer_mode"; field: "objective_timer_mode" | "circuit_timer_mode" }
  | { kind: "retake_policy" }
  | { kind: "ai_mode" }
  | null

function strNum(n: number) {
  return String(n)
}

function parseIntField(text: string, fallback: number) {
  const n = parseInt(text, 10)
  return Number.isFinite(n) ? n : fallback
}

function parseFloatField(text: string, fallback: number) {
  const n = parseFloat(text)
  return Number.isFinite(n) ? n : fallback
}

export function FacultyAssessmentDefaultsScreen() {
  const { scope, ready } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, runSave, setError } = useAdminSaveState()

  const [tab, setTab] = useState<PolicyTab>("timing")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [policy, setPolicy] = useState<AssessmentPolicy>(DEFAULT_ASSESSMENT_POLICY)
  const [picker, setPicker] = useState<PickerState>(null)
  const baseline = useRef(JSON.stringify(DEFAULT_ASSESSMENT_POLICY))

  const load = useCallback(async () => {
    if (!scope) return
    const response = await instructorAdminApi.getCoursePolicies(scope)
    const next = parseAssessmentPolicy(response.assessment_policy)
    setPolicy(next)
    baseline.current = JSON.stringify(next)
    resetDirty()
  }, [scope, resetDirty])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load assessment defaults.")
      })
      .finally(() => setLoading(false))
  }, [ready, load, setError])

  function updatePolicy(next: AssessmentPolicy) {
    setPolicy(next)
    markDirty()
  }

  function handleReset() {
    updatePolicy({
      timer: { ...DEFAULT_ASSESSMENT_POLICY.timer },
      sections: { ...DEFAULT_ASSESSMENT_POLICY.sections },
      retakes: { ...DEFAULT_ASSESSMENT_POLICY.retakes },
      anti_cheat: { ...DEFAULT_ASSESSMENT_POLICY.anti_cheat },
      ai: { ...DEFAULT_ASSESSMENT_POLICY.ai },
      access: { ...DEFAULT_ASSESSMENT_POLICY.access },
      superpowers: { ...DEFAULT_ASSESSMENT_POLICY.superpowers }})
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  function handleSave() {
    if (!scope) return
    void runSave(async () => {
      await instructorAdminApi.patchCoursePolicies(scope, { assessment_policy: policy })
      baseline.current = JSON.stringify(policy)
    })
  }

  const timerModeLabel = (mode: SectionTimerMode) =>
    TIMER_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode

  const retakePolicyLabel = (mode: RetakePolicyDefault) =>
    RETAKE_POLICY_OPTIONS.find((o) => o.value === mode)?.label ?? mode

  const aiModeLabel = (mode: AiEvaluationModeDefault) =>
    AI_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode

  const adminStyles = useAdminStyles()
  const { native, type } = adminStyles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        resetRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: NATIVE.rowMinHeight,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: native.secondaryGrouped,
        },
        resetRowText: {
          ...type.bodyEmphasis,
          color: FACULTY_ADMIN_COLOR.link,
        },
      }),
    [native, type],
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

        {tab === "timing" ? (
          <FacultyAdminSection title="Question Timers" footer="Defaults when an assessment has no explicit timer.">
            <FacultyAdminChoiceField
              label="Time per Question"
              value={strNum(policy.timer.time_per_question_default)}
              options={secondsSelectOptions(policy.timer.time_per_question_default)}
              onChange={(text) =>
                updatePolicy({
                  ...policy,
                  timer: { ...policy.timer, time_per_question_default: parseIntField(text, policy.timer.time_per_question_default) }})
              }
            />
            <FacultyAdminChoiceField
              label="MCQ Seconds"
              value={strNum(policy.timer.objective_mcq_seconds)}
              options={secondsSelectOptions(policy.timer.objective_mcq_seconds)}
              onChange={(text) =>
                updatePolicy({
                  ...policy,
                  timer: { ...policy.timer, objective_mcq_seconds: parseIntField(text, policy.timer.objective_mcq_seconds) }})
              }
            />
            <FacultyAdminChoiceField
              label="True / False Seconds"
              value={strNum(policy.timer.objective_true_false_seconds)}
              options={secondsSelectOptions(policy.timer.objective_true_false_seconds)}
              onChange={(text) =>
                updatePolicy({
                  ...policy,
                  timer: {
                    ...policy.timer,
                    objective_true_false_seconds: parseIntField(text, policy.timer.objective_true_false_seconds)}})
              }
            />
            <FacultyAdminChoiceField
              label="Select All Seconds"
              value={strNum(policy.timer.objective_select_all_seconds)}
              options={secondsSelectOptions(policy.timer.objective_select_all_seconds)}
              onChange={(text) =>
                updatePolicy({
                  ...policy,
                  timer: {
                    ...policy.timer,
                    objective_select_all_seconds: parseIntField(text, policy.timer.objective_select_all_seconds)}})
              }
            />
            <FacultyAdminChoiceField
              label="Hybrid Circuit Pooled"
              value={strNum(policy.timer.hybrid_circuit_section_pooled_seconds)}
              options={secondsSelectOptions(policy.timer.hybrid_circuit_section_pooled_seconds)}
              onChange={(text) =>
                updatePolicy({
                  ...policy,
                  timer: {
                    ...policy.timer,
                    hybrid_circuit_section_pooled_seconds: parseIntField(
                      text,
                      policy.timer.hybrid_circuit_section_pooled_seconds,
                    )}})
              }
            />
            <FacultyAdminChoiceField
              label="Circuit Only per Question"
              value={strNum(policy.timer.circuit_only_seconds_per_question)}
              options={secondsSelectOptions(policy.timer.circuit_only_seconds_per_question)}
              onChange={(text) =>
                updatePolicy({
                  ...policy,
                  timer: {
                    ...policy.timer,
                    circuit_only_seconds_per_question: parseIntField(
                      text,
                      policy.timer.circuit_only_seconds_per_question,
                    )}})
              }
            />
          </FacultyAdminSection>
        ) : null}

        {tab === "sections" ? (
          <>
            <FacultyAdminSection title="Objective Sections">
              <FacultyAdminSelectRow
                label="Timer Mode"
                valueLabel={timerModeLabel(policy.sections.objective_timer_mode)}
                onPress={() => setPicker({ kind: "timer_mode", field: "objective_timer_mode" })}
              />
              <FacultyAdminToggleRow
                label="Allow Backtracking"
                value={policy.sections.objective_allow_backtracking}
                onChange={(next) =>
                  updatePolicy({ ...policy, sections: { ...policy.sections, objective_allow_backtracking: next } })
                }
              />
              <FacultyAdminToggleRow
                label="Auto Submit on Expire"
                value={policy.sections.objective_auto_submit_on_expire}
                onChange={(next) =>
                  updatePolicy({ ...policy, sections: { ...policy.sections, objective_auto_submit_on_expire: next } })
                }
              />
            </FacultyAdminSection>
            <FacultyAdminSection title="Circuit Sections">
              <FacultyAdminSelectRow
                label="Timer Mode"
                valueLabel={timerModeLabel(policy.sections.circuit_timer_mode)}
                onPress={() => setPicker({ kind: "timer_mode", field: "circuit_timer_mode" })}
              />
              <FacultyAdminToggleRow
                label="Allow Backtracking"
                value={policy.sections.circuit_allow_backtracking}
                onChange={(next) =>
                  updatePolicy({ ...policy, sections: { ...policy.sections, circuit_allow_backtracking: next } })
                }
              />
              <FacultyAdminToggleRow
                label="Auto Submit on Expire"
                value={policy.sections.circuit_auto_submit_on_expire}
                onChange={(next) =>
                  updatePolicy({ ...policy, sections: { ...policy.sections, circuit_auto_submit_on_expire: next } })
                }
              />
            </FacultyAdminSection>
          </>
        ) : null}

        {tab === "retakes" ? (
          <FacultyAdminSection title="Retake Defaults">
            <FacultyAdminToggleRow
              label="Retakes Enabled"
              value={policy.retakes.retake_enabled_default}
              onChange={(next) =>
                updatePolicy({ ...policy, retakes: { ...policy.retakes, retake_enabled_default: next } })
              }
            />
            <FacultyAdminChoiceField
              label="Retake Limit"
              value={strNum(policy.retakes.retake_limit_default)}
              options={RETAKE_LIMIT_OPTIONS}
              onChange={(text) =>
                updatePolicy({
                  ...policy,
                  retakes: { ...policy.retakes, retake_limit_default: parseIntField(text, policy.retakes.retake_limit_default) }})
              }
            />
            <FacultyAdminSelectRow
              label="Scoring Policy"
              valueLabel={retakePolicyLabel(policy.retakes.retake_policy_default)}
              onPress={() => setPicker({ kind: "retake_policy" })}
            />
            <FacultyAdminToggleRow
              label="Review Before Retake"
              value={policy.retakes.review_before_retake_default}
              onChange={(next) =>
                updatePolicy({ ...policy, retakes: { ...policy.retakes, review_before_retake_default: next } })
              }
            />
            <FacultyAdminToggleRow
              label="Forfeit Retake on Report View"
              value={policy.retakes.forfeit_retake_on_report_view_default}
              onChange={(next) =>
                updatePolicy({
                  ...policy,
                  retakes: { ...policy.retakes, forfeit_retake_on_report_view_default: next }})
              }
            />
            <FacultyAdminToggleRow
              label="Lock Student Results Review"
              value={policy.retakes.lock_student_results_review_default}
              onChange={(next) =>
                updatePolicy({
                  ...policy,
                  retakes: { ...policy.retakes, lock_student_results_review_default: next }})
              }
            />
          </FacultyAdminSection>
        ) : null}

        {tab === "integrity" ? (
          <FacultyAdminSection title="Anti-Cheat Defaults">
            <FacultyAdminToggleRow
              label="Strict Mode"
              value={policy.anti_cheat.strict_mode_default}
              onChange={(next) =>
                updatePolicy({ ...policy, anti_cheat: { ...policy.anti_cheat, strict_mode_default: next } })
              }
            />
            <FacultyAdminToggleRow
              label="Block Copy / Paste"
              value={policy.anti_cheat.block_copy_paste_default}
              onChange={(next) =>
                updatePolicy({ ...policy, anti_cheat: { ...policy.anti_cheat, block_copy_paste_default: next } })
              }
            />
            <FacultyAdminToggleRow
              label="Track Tab Switches"
              value={policy.anti_cheat.track_tab_switches_default}
              onChange={(next) =>
                updatePolicy({ ...policy, anti_cheat: { ...policy.anti_cheat, track_tab_switches_default: next } })
              }
            />
            <FacultyAdminChoiceField
              label="Max Tab Switches"
              value={strNum(policy.anti_cheat.max_tab_switches_default)}
              options={STRIKE_COUNT_OPTIONS}
              onChange={(text) =>
                updatePolicy({
                  ...policy,
                  anti_cheat: {
                    ...policy.anti_cheat,
                    max_tab_switches_default: parseIntField(text, policy.anti_cheat.max_tab_switches_default)}})
              }
            />
            <FacultyAdminToggleRow
              label="Warn on Tab Switch"
              value={policy.anti_cheat.warn_on_tab_switch_default}
              onChange={(next) =>
                updatePolicy({ ...policy, anti_cheat: { ...policy.anti_cheat, warn_on_tab_switch_default: next } })
              }
            />
            <FacultyAdminToggleRow
              label="Auto Submit on Violations"
              value={policy.anti_cheat.auto_submit_on_violations_default}
              onChange={(next) =>
                updatePolicy({
                  ...policy,
                  anti_cheat: { ...policy.anti_cheat, auto_submit_on_violations_default: next }})
              }
            />
            <FacultyAdminToggleRow
              label="Require Fullscreen"
              value={policy.anti_cheat.require_fullscreen_default}
              onChange={(next) =>
                updatePolicy({ ...policy, anti_cheat: { ...policy.anti_cheat, require_fullscreen_default: next } })
              }
            />
            <FacultyAdminToggleRow
              label="Track Gemini Window"
              value={policy.anti_cheat.track_gemini_window_default}
              onChange={(next) =>
                updatePolicy({ ...policy, anti_cheat: { ...policy.anti_cheat, track_gemini_window_default: next } })
              }
            />
            <FacultyAdminChoiceField
              label="Max Gemini Strikes"
              value={strNum(policy.anti_cheat.max_gemini_strikes_default)}
              options={STRIKE_COUNT_OPTIONS}
              onChange={(text) =>
                updatePolicy({
                  ...policy,
                  anti_cheat: {
                    ...policy.anti_cheat,
                    max_gemini_strikes_default: parseIntField(text, policy.anti_cheat.max_gemini_strikes_default)}})
              }
            />
            <FacultyAdminToggleRow
              label="Keystroke Playback Enforced"
              value={policy.anti_cheat.keystroke_playback_enforced_default}
              onChange={(next) =>
                updatePolicy({
                  ...policy,
                  anti_cheat: { ...policy.anti_cheat, keystroke_playback_enforced_default: next }})
              }
            />
          </FacultyAdminSection>
        ) : null}

        {tab === "access_ai" ? (
          <>
            <FacultyAdminSection title="Access Defaults">
              <FacultyAdminToggleRow
                label="Counts Toward Grade"
                value={policy.access.counts_toward_grade_default}
                onChange={(next) =>
                  updatePolicy({ ...policy, access: { ...policy.access, counts_toward_grade_default: next } })
                }
              />
              <FacultyAdminToggleRow
                label="Restrict Access"
                value={policy.access.restrict_access_default}
                onChange={(next) =>
                  updatePolicy({ ...policy, access: { ...policy.access, restrict_access_default: next } })
                }
              />
              <FacultyAdminToggleRow
                label="Geo Required"
                value={policy.access.geo_required_default}
                onChange={(next) =>
                  updatePolicy({ ...policy, access: { ...policy.access, geo_required_default: next } })
                }
              />
              <FacultyAdminChoiceField
                label="Geo Radius"
                value={strNum(policy.access.geo_radius_meters_default)}
                options={GEO_RADIUS_OPTIONS}
                onChange={(text) =>
                  updatePolicy({
                    ...policy,
                    access: {
                      ...policy.access,
                      geo_radius_meters_default: parseIntField(text, policy.access.geo_radius_meters_default)}})
                }
              />
            </FacultyAdminSection>

            <FacultyAdminSection title="AI Grading Defaults">
              <FacultyAdminSelectRow
                label="Evaluation Mode"
                valueLabel={aiModeLabel(policy.ai.ai_evaluation_mode_default)}
                onPress={() => setPicker({ kind: "ai_mode" })}
              />
              <FacultyAdminTextField
                label="AI Model Default"
                value={policy.ai.ai_model_default}
                onChangeText={(text) =>
                  updatePolicy({ ...policy, ai: { ...policy.ai, ai_model_default: text } })
                }
                placeholder="auto"
              />
              <FacultyAdminToggleRow
                label="Enable Opus Fallback"
                value={policy.ai.ai_enable_opus_fallback_default}
                onChange={(next) =>
                  updatePolicy({ ...policy, ai: { ...policy.ai, ai_enable_opus_fallback_default: next } })
                }
              />
              <FacultyAdminChoiceField
                label="Opus Confidence Threshold"
                value={String(policy.ai.ai_opus_confidence_threshold_default)}
                options={CONFIDENCE_THRESHOLD_OPTIONS}
                onChange={(text) =>
                  updatePolicy({
                    ...policy,
                    ai: {
                      ...policy.ai,
                      ai_opus_confidence_threshold_default: parseFloatField(
                        text,
                        policy.ai.ai_opus_confidence_threshold_default,
                      )}})
                }
              />
            </FacultyAdminSection>

            <FacultyAdminSection title="Superpowers">
              <FacultyAdminToggleRow
                label="Enable Superpowers"
                value={policy.superpowers.enable_superpowers_default}
                onChange={(next) =>
                  updatePolicy({ ...policy, superpowers: { enable_superpowers_default: next } })
                }
              />
            </FacultyAdminSection>
          </>
        ) : null}

        <FacultyAdminSection
          title="Restore Defaults"
          footer="Resets every tab to platform defaults. Tap Save Changes to persist."
        >
          <Pressable
            style={({ pressed }) => [styles.resetRow, pressed && { opacity: NATIVE.pressedOpacity }]}
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel="Reset to defaults"
          >
            <Ionicons name="refresh-outline" size={18} color={FACULTY_ADMIN_COLOR.link} />
            <Text style={styles.resetRowText}>Reset to Defaults</Text>
          </Pressable>
        </FacultyAdminSection>
      </FacultyAdminScreen>

      {picker?.kind === "timer_mode" ? (
        <AdminOptionPickerModal
          visible
          title="Timer Mode"
          options={TIMER_MODE_OPTIONS}
          value={policy.sections[picker.field]}
          onSelect={(value) =>
            updatePolicy({ ...policy, sections: { ...policy.sections, [picker.field]: value } })
          }
          onClose={() => setPicker(null)}
        />
      ) : null}

      {picker?.kind === "retake_policy" ? (
        <AdminOptionPickerModal
          visible
          title="Retake Scoring Policy"
          options={RETAKE_POLICY_OPTIONS}
          value={policy.retakes.retake_policy_default}
          onSelect={(value) =>
            updatePolicy({ ...policy, retakes: { ...policy.retakes, retake_policy_default: value } })
          }
          onClose={() => setPicker(null)}
        />
      ) : null}

      {picker?.kind === "ai_mode" ? (
        <AdminOptionPickerModal
          visible
          title="AI Evaluation Mode"
          options={AI_MODE_OPTIONS}
          value={policy.ai.ai_evaluation_mode_default}
          onSelect={(value) =>
            updatePolicy({ ...policy, ai: { ...policy.ai, ai_evaluation_mode_default: value } })
          }
          onClose={() => setPicker(null)}
        />
      ) : null}
    </FacultyAdminCourseGate>
  )
}
