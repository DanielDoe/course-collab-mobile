import { useCallback, useEffect, useState } from "react"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import {
  parseAttendancePolicy,
  type AttendancePolicy,
} from "../../../lib/course-policy-settings"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminToggleRow,
  FacultyAdminNumberField,
  FacultyAdminTextField,
  useAdminSaveState,
} from "../faculty-admin-ui"

type AttendanceForm = {
  minimum_attendance_percent: string
  late_arrival_grace_minutes: string
  qr_expiry_minutes_default: string
  radius_meters_default: string
  require_location_default: boolean
  excused_absence_notes: string
}

function policyToForm(policy: AttendancePolicy): AttendanceForm {
  return {
    minimum_attendance_percent: String(policy.minimum_attendance_percent),
    late_arrival_grace_minutes: String(policy.late_arrival_grace_minutes),
    qr_expiry_minutes_default: String(policy.qr_expiry_minutes_default),
    radius_meters_default: String(policy.radius_meters_default),
    require_location_default: policy.require_location_default,
    excused_absence_notes: policy.excused_absence_notes,
  }
}

function formToPolicy(form: AttendanceForm): AttendancePolicy {
  return parseAttendancePolicy({
    minimum_attendance_percent: Number(form.minimum_attendance_percent),
    late_arrival_grace_minutes: Number(form.late_arrival_grace_minutes),
    qr_expiry_minutes_default: Number(form.qr_expiry_minutes_default),
    radius_meters_default: Number(form.radius_meters_default),
    require_location_default: form.require_location_default,
    excused_absence_notes: form.excused_absence_notes,
  })
}

export function FacultyAttendancePoliciesScreen() {
  return (
    <FacultyAdminCourseGate>
      <FacultyAttendancePoliciesContent />
    </FacultyAdminCourseGate>
  )
}

function FacultyAttendancePoliciesContent() {
  const { scope } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, setError, clearError, runSave } =
    useAdminSaveState()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState<AttendanceForm | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    clearError()
    try {
      const data = await instructorAdminApi.getCoursePolicies(scope)
      setForm(policyToForm(parseAttendancePolicy(data.attendance_policy)))
      resetDirty()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load attendance policies.")
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
    (patch: Partial<AttendanceForm>) => {
      setForm((prev) => (prev ? { ...prev, ...patch } : prev))
      markDirty()
    },
    [markDirty],
  )

  const handleSave = useCallback(() => {
    if (!scope || !form) return
    void runSave(async () => {
      const attendance_policy = formToPolicy(form)
      await instructorAdminApi.patchCoursePolicies(scope, { attendance_policy })
      setForm(policyToForm(attendance_policy))
    })
  }, [scope, form, runSave])

  return (
    <FacultyAdminScreen
      title="Attendance Policies"
      loading={loading}
      saving={saving}
      refreshing={refreshing}
      error={error || null}
      dirty={dirty}
      successMessage={successMessage}
      onSave={handleSave}
      onRefresh={onRefresh}
    >
      <FacultyAdminSection title="Requirements">
        <FacultyAdminNumberField
          label="Minimum Attendance"
          value={form?.minimum_attendance_percent ?? ""}
          onChangeText={(text) => patchForm({ minimum_attendance_percent: text })}
          suffix="%"
        />
        <FacultyAdminNumberField
          label="Late Arrival Grace"
          value={form?.late_arrival_grace_minutes ?? ""}
          onChangeText={(text) => patchForm({ late_arrival_grace_minutes: text })}
          suffix="min"
        />
      </FacultyAdminSection>

      <FacultyAdminSection title="QR Check-In Defaults">
        <FacultyAdminNumberField
          label="QR Expiry"
          value={form?.qr_expiry_minutes_default ?? ""}
          onChangeText={(text) => patchForm({ qr_expiry_minutes_default: text })}
          suffix="min"
        />
        <FacultyAdminNumberField
          label="Location Radius"
          value={form?.radius_meters_default ?? ""}
          onChangeText={(text) => patchForm({ radius_meters_default: text })}
          suffix="m"
        />
        <FacultyAdminToggleRow
          label="Require Location"
          subtitle="Students must share location when checking in by default."
          value={form?.require_location_default ?? false}
          onChange={(next) => patchForm({ require_location_default: next })}
        />
      </FacultyAdminSection>

      <FacultyAdminSection title="Excused Absences">
        <FacultyAdminTextField
          label="Notes for Students"
          value={form?.excused_absence_notes ?? ""}
          onChangeText={(text) => patchForm({ excused_absence_notes: text })}
          multiline
          placeholder="Explain how students should request excused absences…"
        />
      </FacultyAdminSection>
    </FacultyAdminScreen>
  )
}
