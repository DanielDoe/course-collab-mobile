import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import {
  DEFAULT_ATTENDANCE_POLICY,
  parseAttendancePolicy,
  type AttendancePolicy,
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
  FacultyAdminTextField,
  useAdminSaveState,
  useAdminStyles,
} from "../faculty-admin-ui"
import { GEO_RADIUS_OPTIONS, MINUTE_OPTIONS, WEIGHT_PERCENT_OPTIONS } from "../FacultyNativePickers"

type AttendanceForm = {
  minimum_attendance_percent: string
  late_arrival_grace_minutes: string
  qr_expiry_minutes_default: string
  radius_meters_default: string
  require_location_default: boolean
  excused_absence_notes: string
}

type PolicyTab = "requirements" | "check_in" | "excused"

const TABS: Array<{ id: PolicyTab; label: string }> = [
  { id: "requirements", label: "Requirements" },
  { id: "check_in", label: "Check-In" },
  { id: "excused", label: "Excused" },
]

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
  const { scope, ready } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, setError, clearError, runSave } =
    useAdminSaveState()
  const [tab, setTab] = useState<PolicyTab>("requirements")
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
    (patch: Partial<AttendanceForm>) => {
      setForm((prev) => (prev ? { ...prev, ...patch } : prev))
      markDirty()
    },
    [markDirty],
  )

  const handleReset = useCallback(() => {
    setForm(policyToForm(DEFAULT_ATTENDANCE_POLICY))
    markDirty()
  }, [markDirty])

  const handleSave = useCallback(() => {
    if (!scope || !form) return
    void runSave(async () => {
      const attendance_policy = formToPolicy(form)
      await instructorAdminApi.patchCoursePolicies(scope, { attendance_policy })
      setForm(policyToForm(attendance_policy))
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

      {tab === "requirements" ? (
        <FacultyAdminSection
          title="Attendance Requirements"
          footer="Minimum attendance applies course-wide. Late grace marks arrivals within this window as on time."
        >
          <FacultyAdminChoiceField
            label="Minimum Attendance"
            value={form?.minimum_attendance_percent ?? ""}
            options={WEIGHT_PERCENT_OPTIONS}
            onChange={(text) => patchForm({ minimum_attendance_percent: text })}
          />
          <FacultyAdminChoiceField
            label="Late Arrival Grace"
            value={form?.late_arrival_grace_minutes ?? ""}
            options={MINUTE_OPTIONS}
            onChange={(text) => patchForm({ late_arrival_grace_minutes: text })}
          />
        </FacultyAdminSection>
      ) : null}

      {tab === "check_in" ? (
        <FacultyAdminSection
          title="QR Check-In Defaults"
          footer="Defaults for new attendance sessions. Location radius applies when geofencing is enabled."
        >
          <FacultyAdminChoiceField
            label="QR Expiry"
            value={form?.qr_expiry_minutes_default ?? ""}
            options={MINUTE_OPTIONS}
            onChange={(text) => patchForm({ qr_expiry_minutes_default: text })}
          />
          <FacultyAdminChoiceField
            label="Location Radius"
            value={form?.radius_meters_default ?? ""}
            options={GEO_RADIUS_OPTIONS}
            onChange={(text) => patchForm({ radius_meters_default: text })}
          />
          <FacultyAdminToggleRow
            label="Require Location"
            subtitle="Students must share location when checking in by default."
            value={form?.require_location_default ?? false}
            onChange={(next) => patchForm({ require_location_default: next })}
          />
        </FacultyAdminSection>
      ) : null}

      {tab === "excused" ? (
        <FacultyAdminSection
          title="Excused Absences"
          footer="Shown to students when they view attendance policy or request an excused absence."
        >
          <FacultyAdminTextField
            label="Notes for Students"
            value={form?.excused_absence_notes ?? ""}
            onChangeText={(text) => patchForm({ excused_absence_notes: text })}
            multiline
            placeholder="Explain how students should request excused absences…"
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
