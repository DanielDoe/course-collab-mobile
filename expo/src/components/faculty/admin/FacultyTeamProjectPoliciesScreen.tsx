import { useCallback, useEffect, useState } from "react"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import { parseProjectPolicy, type ProjectPolicy } from "../../../lib/course-policy-settings"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminToggleRow,
  FacultyAdminNumberField,
  useAdminSaveState,
} from "../faculty-admin-ui"

type ProjectForm = {
  min_team_size: string
  max_team_size: string
  peer_review_weight_percent: string
  late_project_penalty_percent_per_day: string
  allow_self_form_groups: boolean
  peer_review_required: boolean
}

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
  const { scope } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, setError, clearError, runSave } =
    useAdminSaveState()
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
    setLoading(true)
    void load()
  }, [load])

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

  const handleSave = useCallback(() => {
    if (!scope || !form) return
    void runSave(async () => {
      const project_policy = formToPolicy(form)
      await instructorAdminApi.patchCoursePolicies(scope, { project_policy })
      setForm(policyToForm(project_policy))
    })
  }, [scope, form, runSave])

  return (
    <FacultyAdminScreen
      title="Team Project Policies"
      loading={loading}
      saving={saving}
      refreshing={refreshing}
      error={error || null}
      dirty={dirty}
      successMessage={successMessage}
      onSave={handleSave}
      onRefresh={onRefresh}
    >
      <FacultyAdminSection title="Team Size">
        <FacultyAdminNumberField
          label="Minimum Team Size"
          value={form?.min_team_size ?? ""}
          onChangeText={(text) => patchForm({ min_team_size: text })}
        />
        <FacultyAdminNumberField
          label="Maximum Team Size"
          value={form?.max_team_size ?? ""}
          onChangeText={(text) => patchForm({ max_team_size: text })}
        />
      </FacultyAdminSection>

      <FacultyAdminSection title="Peer Review">
        <FacultyAdminNumberField
          label="Peer Review Weight"
          value={form?.peer_review_weight_percent ?? ""}
          onChangeText={(text) => patchForm({ peer_review_weight_percent: text })}
          suffix="%"
        />
        <FacultyAdminToggleRow
          label="Peer Review Required"
          subtitle="Teams must complete peer reviews before final grades are released."
          value={form?.peer_review_required ?? false}
          onChange={(next) => patchForm({ peer_review_required: next })}
        />
      </FacultyAdminSection>

      <FacultyAdminSection title="Groups & Penalties">
        <FacultyAdminToggleRow
          label="Allow Self-Form Groups"
          subtitle="Students can create and join teams without instructor assignment."
          value={form?.allow_self_form_groups ?? false}
          onChange={(next) => patchForm({ allow_self_form_groups: next })}
        />
        <FacultyAdminNumberField
          label="Late Penalty per Day"
          value={form?.late_project_penalty_percent_per_day ?? ""}
          onChangeText={(text) => patchForm({ late_project_penalty_percent_per_day: text })}
          suffix="%"
        />
      </FacultyAdminSection>
    </FacultyAdminScreen>
  )
}
