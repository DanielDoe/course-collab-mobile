import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import {
  DEFAULT_PROJECT_POLICY,
  parseProjectPolicy,
  type ProjectPolicy,
} from "../../../lib/course-policy-settings"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { FacultyModuleTabBar } from "../faculty-module-shell"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminToggleRow,
  FacultyAdminChoiceField,
  useAdminSaveState,
  useAdminStyles,
} from "../faculty-admin-ui"
import { TEAM_SIZE_OPTIONS, WEIGHT_PERCENT_OPTIONS } from "../FacultyNativePickers"

type ProjectForm = {
  min_team_size: string
  max_team_size: string
  peer_review_weight_percent: string
  late_project_penalty_percent_per_day: string
  allow_self_form_groups: boolean
  peer_review_required: boolean
}

type PolicyTab = "team" | "peer_review" | "groups"

const TABS: Array<{ id: PolicyTab; label: string }> = [
  { id: "team", label: "Team" },
  { id: "peer_review", label: "Peer Review" },
  { id: "groups", label: "Groups" },
]

function policyToForm(policy: ProjectPolicy): ProjectForm {
  return {
    min_team_size: String(policy.min_team_size),
    max_team_size: String(policy.max_team_size),
    peer_review_weight_percent: String(policy.peer_review_weight_percent),
    late_project_penalty_percent_per_day: String(policy.late_project_penalty_percent_per_day),
    allow_self_form_groups: policy.allow_self_form_groups,
    peer_review_required: policy.peer_review_required,
  }
}

function formToPolicy(form: ProjectForm): ProjectPolicy {
  return parseProjectPolicy({
    min_team_size: Number(form.min_team_size),
    max_team_size: Number(form.max_team_size),
    peer_review_weight_percent: Number(form.peer_review_weight_percent),
    late_project_penalty_percent_per_day: Number(form.late_project_penalty_percent_per_day),
    allow_self_form_groups: form.allow_self_form_groups,
    peer_review_required: form.peer_review_required,
  })
}

export function FacultyTeamProjectPoliciesScreen() {
  return (
    <FacultyAdminCourseGate>
      <FacultyTeamProjectPoliciesContent />
    </FacultyAdminCourseGate>
  )
}

function FacultyTeamProjectPoliciesContent() {
  const { scope, ready } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, setError, clearError, runSave } =
    useAdminSaveState()
  const [tab, setTab] = useState<PolicyTab>("team")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState<ProjectForm | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    clearError()
    try {
      const data = await instructorAdminApi.getCoursePolicies(scope)
      setForm(policyToForm(parseProjectPolicy(data.project_policy)))
      resetDirty()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load project policies.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [scope, clearError, resetDirty, setError])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    void load()
  }, [ready, load])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void load()
  }, [load])

  const patchForm = useCallback(
    (patch: Partial<ProjectForm>) => {
      setForm((prev) => (prev ? { ...prev, ...patch } : prev))
      markDirty()
    },
    [markDirty],
  )

  const handleReset = useCallback(() => {
    setForm(policyToForm(DEFAULT_PROJECT_POLICY))
    markDirty()
  }, [markDirty])

  const handleSave = useCallback(() => {
    if (!scope || !form) return
    void runSave(async () => {
      const project_policy = formToPolicy(form)
      await instructorAdminApi.patchCoursePolicies(scope, { project_policy })
      setForm(policyToForm(project_policy))
    })
  }, [scope, form, runSave])

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
      <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} scrollable />

      {tab === "team" ? (
        <FacultyAdminSection
          title="Team Size"
          footer="Minimum and maximum members allowed per project team."
        >
          <FacultyAdminChoiceField
            label="Minimum Team Size"
            value={form?.min_team_size ?? ""}
            options={TEAM_SIZE_OPTIONS}
            onChange={(text) => patchForm({ min_team_size: text })}
          />
          <FacultyAdminChoiceField
            label="Maximum Team Size"
            value={form?.max_team_size ?? ""}
            options={TEAM_SIZE_OPTIONS}
            onChange={(text) => patchForm({ max_team_size: text })}
          />
        </FacultyAdminSection>
      ) : null}

      {tab === "peer_review" ? (
        <FacultyAdminSection
          title="Peer Review"
          footer="Peer review weight applies when teams evaluate each other's contributions."
        >
          <FacultyAdminToggleRow
            label="Peer Review Required"
            subtitle="Teams must complete peer reviews before final grades are released."
            value={form?.peer_review_required ?? false}
            onChange={(next) => patchForm({ peer_review_required: next })}
          />
          <FacultyAdminChoiceField
            label="Peer Review Weight"
            value={form?.peer_review_weight_percent ?? ""}
            options={WEIGHT_PERCENT_OPTIONS}
            disabled={!form?.peer_review_required}
            onChange={(text) => patchForm({ peer_review_weight_percent: text })}
          />
        </FacultyAdminSection>
      ) : null}

      {tab === "groups" ? (
        <FacultyAdminSection
          title="Groups & Penalties"
          footer="Self-form groups let students create teams without instructor assignment."
        >
          <FacultyAdminToggleRow
            label="Allow Self-Form Groups"
            subtitle="Students can create and join teams without instructor assignment."
            value={form?.allow_self_form_groups ?? false}
            onChange={(next) => patchForm({ allow_self_form_groups: next })}
          />
          <FacultyAdminChoiceField
            label="Late Penalty per Day"
            value={form?.late_project_penalty_percent_per_day ?? ""}
            options={WEIGHT_PERCENT_OPTIONS}
            onChange={(text) => patchForm({ late_project_penalty_percent_per_day: text })}
          />
        </FacultyAdminSection>
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
  )
}
