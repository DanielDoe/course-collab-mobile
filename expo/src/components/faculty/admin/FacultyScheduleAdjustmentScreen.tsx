import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { AppAlert } from "../../../lib/app-alert"
import { ApiError } from "../../../lib/api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  instructorScheduleAdjustmentApi,
  type InstructorScheduleCandidate,
  type InstructorScheduleDashboard,
  type InstructorScheduleRequest,
} from "../../../lib/instructor-schedule-adjustment-api"
import {
  DAY_CODE_LABELS,
  DAY_CODES,
  type DayCode,
  formatPollColumnLabel,
  formatStatusLabel,
  formatTime12h,
} from "../../../lib/schedule-adjustment/time-slots"
import { ScheduleAdjustmentStepper } from "../../schedule-adjustment/ScheduleAdjustmentStepper"
import { ScheduleAdjustmentNoticeBanner } from "../../schedule-adjustment/ScheduleAdjustmentNoticeBanner"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminTextField,
} from "../faculty-admin-ui"
import { FacultySummerCampDatePicker } from "../FacultySummerCampDatePicker"
import { NativeSelect } from "../../NativeSelect"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { FacultyEmptyState } from "../faculty-shared"

const TIME_OPTIONS = Array.from({ length: 29 }, (_, i) => {
  const minutes = 7 * 60 + i * 30
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0")
  const mm = String(minutes % 60).padStart(2, "0")
  const value = `${hh}:${mm}`
  const hour = Math.floor(minutes / 60)
  const mer = hour >= 12 ? "PM" : "AM"
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return { value, label: `${h12}:${mm} ${mer}` }
})

const DURATION_OPTIONS = ["50", "60", "75", "80", "90", "110", "120", "150", "180"].map((value) => ({
  value,
  label: `${value} min`,
}))

const INCREMENT_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
]

const MEETING_TYPE_OPTIONS = [
  { value: "lecture", label: "Lecture" },
  { value: "laboratory", label: "Laboratory" },
  { value: "both", label: "Lecture and lab" },
]

function defaultDeadlineDate() {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function FacultyScheduleAdjustmentScreen() {
  return (
    <FacultyAdminCourseGate>
      <FacultyScheduleAdjustmentContent />
    </FacultyAdminCourseGate>
  )
}

function FacultyScheduleAdjustmentContent() {
  const { scope } = useFacultyScope()
  const native = useThemedNative()
  const type = useNativeType()
  const [requests, setRequests] = useState<InstructorScheduleRequest[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<InstructorScheduleDashboard | null>(null)
  const [candidates, setCandidates] = useState<InstructorScheduleCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    pollKind: "recurring" as "recurring" | "one_off",
    meetingType: "lecture",
    reason: "",
    deadlineDate: defaultDeadlineDate(),
    deadlineTime: "17:00",
    candidateStartTime: "08:00",
    candidateEndTime: "17:00",
    meetingDurationMinutes: "110",
    slotIncrementMinutes: "30",
    instructorNotes: "",
    candidateDays: ["MO", "TU", "WE", "TH", "FR"] as string[],
    missedClassDate: "",
    makeupDates: [] as string[],
    pendingMakeupDate: "",
  })

  const [deptForm, setDeptForm] = useState({
    approvedBy: "",
    building: "",
    room: "",
    effectiveDate: "",
    confirmationChecked: false,
    notes: "",
  })

  const loadList = useCallback(async () => {
    if (!scope) return
    setError("")
    const data = await instructorScheduleAdjustmentApi.list(scope)
    setRequests(data.requests ?? [])
  }, [scope])

  const loadDetail = useCallback(
    async (id: number) => {
      if (!scope) return
      setSelectedId(id)
      try {
        const [main, cand] = await Promise.all([
          instructorScheduleAdjustmentApi.getDashboard(scope, id),
          instructorScheduleAdjustmentApi.getCandidates(scope, id),
        ])
        setDetail(main)
        setCandidates(cand.candidates ?? [])
      } catch (err) {
        setDetail(null)
        setError(err instanceof ApiError ? err.message : "Could not load request details.")
      }
    },
    [scope],
  )

  useEffect(() => {
    setLoading(true)
    loadList()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load requests."))
      .finally(() => setLoading(false))
  }, [loadList])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadList()
      if (selectedId && selectedId > 0) await loadDetail(selectedId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refresh failed.")
    } finally {
      setRefreshing(false)
    }
  }, [loadList, loadDetail, selectedId])

  const postAction = async (body: Record<string, unknown>) => {
    if (!scope || !selectedId || selectedId <= 0) return
    setSaving(true)
    try {
      await instructorScheduleAdjustmentApi.action(scope, selectedId, body)
      AppAlert.alert("Saved", "Workflow updated.")
      await loadDetail(selectedId)
      await loadList()
    } catch (err) {
      AppAlert.alert("Error", err instanceof ApiError ? err.message : "Action failed.")
    } finally {
      setSaving(false)
    }
  }

  const createRequest = async () => {
    if (!scope || !form.reason.trim() || !form.deadlineDate) {
      AppAlert.alert("Missing fields", "Reason and a poll deadline are required.")
      return
    }
    if (form.pollKind === "recurring" && form.candidateDays.length === 0) {
      AppAlert.alert("Missing days", "Select at least one weekday to poll.")
      return
    }
    if (form.pollKind === "one_off" && (!form.missedClassDate || form.makeupDates.length === 0)) {
      AppAlert.alert("Missing dates", "Choose the missed class date and at least one makeup date.")
      return
    }
    setCreating(true)
    try {
      const data = await instructorScheduleAdjustmentApi.create(scope, {
        pollKind: form.pollKind,
        meetingType: form.meetingType,
        reason: form.reason.trim(),
        availabilityEndsAt: `${form.deadlineDate}T${form.deadlineTime}:00`,
        candidateStartTime: `${form.candidateStartTime}:00`,
        candidateEndTime: `${form.candidateEndTime}:00`,
        candidateDays: form.pollKind === "recurring" ? form.candidateDays : [],
        candidateDates: form.pollKind === "one_off" ? form.makeupDates : [],
        missedClassDate: form.pollKind === "one_off" ? form.missedClassDate || null : null,
        meetingDurationMinutes: Number(form.meetingDurationMinutes) || 110,
        slotIncrementMinutes: Number(form.slotIncrementMinutes) || 30,
        instructorNotes: form.instructorNotes.trim() || undefined,
      })
      const id = data.request?.id
      if (id) {
        await instructorScheduleAdjustmentApi.action(scope, id, { action: "start_availability" })
        await loadList()
        await loadDetail(id)
      } else {
        await loadList()
        setSelectedId(null)
      }
    } catch (err) {
      AppAlert.alert("Error", err instanceof ApiError ? err.message : "Create failed.")
    } finally {
      setCreating(false)
    }
  }

  const request = detail?.request
  const consent = detail?.consent
  const enrollmentDelta = detail?.enrollmentDelta

  if (selectedId && selectedId > 0 && request) {
    return (
      <FacultyAdminScreen loading={false} refreshing={refreshing} onRefresh={onRefresh}>
        <ScheduleAdjustmentNoticeBanner />
        <Pressable onPress={() => { setSelectedId(null); setDetail(null) }}>
          <Text style={[type.caption, { color: FACULTY_ADMIN_COLOR.tabActive }]}>← All requests</Text>
        </Pressable>

        <Text style={[type.sheetTitle, styles.title]}>{request.reason}</Text>
        <ScheduleAdjustmentStepper status={request.status} />

        {enrollmentDelta?.changed ? (
          <View style={[styles.notice, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
            <Text style={type.secondary}>Enrollment changed — refresh participants before consent.</Text>
            <Pressable
              onPress={() => void postAction({ action: "refresh_enrollment" })}
              style={[styles.smallCta, { borderColor: native.separator }]}
            >
              <Text style={type.bodyEmphasis}>Refresh</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <Stat label="Response" value={`${detail?.responseRate ?? 0}%`} />
          <Stat label="Consent" value={`${consent?.agreed ?? 0}/${consent?.total ?? 0}`} />
          <Stat label="Dept" value={request.department_approval_status ?? "pending"} />
        </View>

        {["REVIEWING_RESULTS", "AWAITING_DEPARTMENT_APPROVAL"].includes(request.status) ? (
          <View style={styles.requestsSection}>
            <Text style={[type.sectionHeader, styles.sectionLabel]}>Availability analysis</Text>
            {candidates.length === 0 ? (
              <Text style={[type.secondary, styles.insetCopy]}>No candidate slots yet.</Text>
            ) : (
              <View style={[styles.requestList, { backgroundColor: native.secondaryGrouped }]}>
                {candidates.map((c, index) => (
                  <Pressable
                    key={c.id}
                    onPress={() => void postAction({ action: "select_candidate", candidateId: c.id })}
                    style={[
                      styles.listRow,
                      { borderBottomColor: native.separator, backgroundColor: c.selected ? "rgba(16,185,129,0.12)" : undefined },
                      index === candidates.length - 1 && styles.listRowLast,
                    ]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={type.bodyEmphasis}>
                        {formatPollColumnLabel(c.day_of_week)}{" "}
                        {formatTime12h(c.start_time)} – {formatTime12h(c.end_time)}
                      </Text>
                      <Text style={type.caption}>
                        {c.available_count} available · {Math.round(c.agreement_percentage)}% · {c.consensus_category}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {["AWAITING_DEPARTMENT_APPROVAL", "DEPARTMENT_APPROVED"].includes(request.status) ? (
          <>
            <FacultyAdminSection title="Department confirmation">
              <FacultyAdminTextField label="Approved by" value={deptForm.approvedBy} onChangeText={(v) => setDeptForm((f) => ({ ...f, approvedBy: v }))} />
              <FacultyAdminTextField label="Building" value={deptForm.building} onChangeText={(v) => setDeptForm((f) => ({ ...f, building: v }))} />
              <FacultyAdminTextField label="Room" value={deptForm.room} onChangeText={(v) => setDeptForm((f) => ({ ...f, room: v }))} />
              <FacultyAdminTextField label="Notes" value={deptForm.notes} onChangeText={(v) => setDeptForm((f) => ({ ...f, notes: v }))} multiline isLast />
            </FacultyAdminSection>
            <View style={styles.pickerCard}>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Effective date</Text>
              <FacultySummerCampDatePicker
                value={deptForm.effectiveDate}
                onChange={(v) => setDeptForm((f) => ({ ...f, effectiveDate: v }))}
                accessibilityLabel="Effective date"
              />
            </View>
            <Pressable onPress={() => setDeptForm((f) => ({ ...f, confirmationChecked: !f.confirmationChecked }))} style={styles.checkRow}>
              <View style={[styles.checkbox, deptForm.confirmationChecked && { backgroundColor: FACULTY_ADMIN_COLOR.tabActive }]} />
              <Text style={[type.caption, { flex: 1 }]}>
                I confirm department approval and classroom availability.
              </Text>
            </Pressable>
            <ActionButton
              label="Record department approval"
              disabled={saving || !deptForm.confirmationChecked}
              onPress={() =>
                void postAction({
                  action: "record_department",
                  approvalStatus: "approved",
                  approvedBy: deptForm.approvedBy,
                  building: deptForm.building,
                  room: deptForm.room,
                  effectiveDate: deptForm.effectiveDate,
                  instructorNotes: deptForm.notes,
                  confirmationChecked: deptForm.confirmationChecked,
                })
              }
            />
            {request.status === "DEPARTMENT_APPROVED" ? (
              <ActionButton label="Start consent collection" disabled={saving} onPress={() => void postAction({ action: "start_consent" })} />
            ) : null}
          </>
        ) : null}

        {["COLLECTING_CONSENT", "CONSENT_COMPLETE", "READY_TO_FINALIZE"].includes(request.status) ? (
          <>
            <FacultyAdminSection title="Consent">
              <Text style={[type.secondary, styles.insetCopy]}>
                {consent?.agreed ?? 0} agreed · {consent?.pending ?? 0} pending · {consent?.declined ?? 0} declined
              </Text>
            </FacultyAdminSection>
            {request.status === "COLLECTING_CONSENT" ? (
              <ActionButton label="Send consent reminder" disabled={saving} onPress={() => void postAction({ action: "remind_consent" })} />
            ) : null}
            {request.status === "READY_TO_FINALIZE" ? (
              <ActionButton
                label="Finalize schedule change"
                disabled={saving}
                onPress={() => {
                  AppAlert.alert(
                    "Finalize schedule change?",
                    "This publishes the new meeting time to enrolled students and cannot be undone from this screen.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Finalize",
                        style: "destructive",
                        onPress: () => void postAction({ action: "finalize", confirmText: "CONFIRM" }),
                      },
                    ],
                  )
                }}
              />
            ) : null}
          </>
        ) : null}

        {request.status !== "COMPLETED" && request.status !== "FINALIZED" ? (
          <ActionButton
            label="Cancel request"
            tone="danger"
            disabled={saving}
            onPress={() => void postAction({ action: "cancel", reason: "Cancelled by instructor" })}
          />
        ) : null}
      </FacultyAdminScreen>
    )
  }

  return (
    <FacultyAdminScreen
      loading={loading}
      refreshing={refreshing}
      error={error || null}
      onRefresh={onRefresh}
    >
      <ScheduleAdjustmentNoticeBanner />

      {selectedId === -1 ? (
        <>
          <View style={styles.row}>
            <ActionButton
              label="Weekly change"
              tone={form.pollKind === "recurring" ? "primary" : "outline"}
              onPress={() => setForm((f) => ({ ...f, pollKind: "recurring" }))}
            />
            <ActionButton
              label="Makeup class"
              tone={form.pollKind === "one_off" ? "primary" : "outline"}
              onPress={() => setForm((f) => ({ ...f, pollKind: "one_off" }))}
            />
          </View>
          <FacultyAdminSection title="New schedule adjustment">
            <FacultyAdminTextField
              label="Reason for change"
              value={form.reason}
              onChangeText={(v) => setForm((f) => ({ ...f, reason: v }))}
              multiline
            />
            <FacultyAdminTextField
              label="Instructor notes"
              placeholder="Optional"
              value={form.instructorNotes}
              onChangeText={(v) => setForm((f) => ({ ...f, instructorNotes: v }))}
              multiline
              isLast
            />
          </FacultyAdminSection>
          <View style={styles.pickerCard}>
            <NativeSelect
              label="Meeting type"
              placeholder="Lecture"
              value={form.meetingType}
              options={MEETING_TYPE_OPTIONS}
              onChange={(v) => setForm((f) => ({ ...f, meetingType: v }))}
            />
            <View style={styles.pickerBlock}>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Poll deadline</Text>
              <FacultySummerCampDatePicker
                value={form.deadlineDate}
                onChange={(deadlineDate) => setForm((f) => ({ ...f, deadlineDate }))}
                accessibilityLabel="Poll deadline date"
              />
              <NativeSelect
                label="Deadline time"
                placeholder="5:00 PM"
                value={form.deadlineTime}
                options={TIME_OPTIONS}
                onChange={(deadlineTime) => setForm((f) => ({ ...f, deadlineTime }))}
              />
            </View>
            <View style={styles.pickerRow}>
              <View style={{ flex: 1 }}>
                <NativeSelect
                  label="Earliest start"
                  placeholder="8:00 AM"
                  value={form.candidateStartTime}
                  options={TIME_OPTIONS}
                  onChange={(candidateStartTime) => setForm((f) => ({ ...f, candidateStartTime }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <NativeSelect
                  label="Latest end"
                  placeholder="5:00 PM"
                  value={form.candidateEndTime}
                  options={TIME_OPTIONS}
                  onChange={(candidateEndTime) => setForm((f) => ({ ...f, candidateEndTime }))}
                />
              </View>
            </View>
            <View style={styles.pickerRow}>
              <View style={{ flex: 1 }}>
                <NativeSelect
                  label="Class length"
                  placeholder="110 min"
                  value={form.meetingDurationMinutes}
                  options={DURATION_OPTIONS}
                  onChange={(meetingDurationMinutes) => setForm((f) => ({ ...f, meetingDurationMinutes }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <NativeSelect
                  label="Time slots"
                  placeholder="30 minutes"
                  value={form.slotIncrementMinutes}
                  options={INCREMENT_OPTIONS}
                  onChange={(slotIncrementMinutes) => setForm((f) => ({ ...f, slotIncrementMinutes }))}
                />
              </View>
            </View>
            {form.pollKind === "recurring" ? (
              <View style={styles.pickerBlock}>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>Weekdays to poll</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {DAY_CODES.map((day) => {
                    const on = form.candidateDays.includes(day)
                    return (
                      <Pressable
                        key={day}
                        onPress={() =>
                          setForm((f) => ({
                            ...f,
                            candidateDays: on
                              ? f.candidateDays.filter((d) => d !== day)
                              : [...f.candidateDays, day],
                          }))
                        }
                        style={[
                          styles.chip,
                          {
                            backgroundColor: on ? FACULTY_ADMIN_COLOR.tabActive : native.secondaryGrouped,
                            borderColor: native.separator,
                          },
                        ]}
                      >
                        <Text style={[type.caption, { color: on ? "#fff" : native.label, fontWeight: "600" }]}>
                          {DAY_CODE_LABELS[day as DayCode].slice(0, 3)}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.pickerBlock}>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>Missed class date</Text>
                <FacultySummerCampDatePicker
                  value={form.missedClassDate}
                  onChange={(missedClassDate) => setForm((f) => ({ ...f, missedClassDate }))}
                  accessibilityLabel="Missed class date"
                />
                <Text style={[type.caption, { color: native.secondaryLabel }]}>Makeup dates to poll</Text>
                <FacultySummerCampDatePicker
                  value={form.pendingMakeupDate}
                  onChange={(pendingMakeupDate) => setForm((f) => ({ ...f, pendingMakeupDate }))}
                  accessibilityLabel="Makeup date to add"
                />
                <ActionButton
                  label="Add makeup date"
                  tone="outline"
                  onPress={() => {
                    if (!form.pendingMakeupDate || form.makeupDates.includes(form.pendingMakeupDate)) return
                    setForm((f) => ({
                      ...f,
                      makeupDates: [...f.makeupDates, f.pendingMakeupDate].sort(),
                      pendingMakeupDate: "",
                    }))
                  }}
                />
                <View style={styles.chipWrap}>
                  {form.makeupDates.map((date) => (
                    <Pressable
                      key={date}
                      onPress={() =>
                        setForm((f) => ({ ...f, makeupDates: f.makeupDates.filter((d) => d !== date) }))
                      }
                      style={[styles.chip, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
                    >
                      <Text style={[type.caption, { color: native.label }]}>{formatPollColumnLabel(date)} ×</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
          <View style={styles.row}>
            <ActionButton label={creating ? "Starting…" : "Start poll"} disabled={creating} onPress={() => void createRequest()} />
            <ActionButton label="Cancel" tone="outline" onPress={() => setSelectedId(null)} />
          </View>
        </>
      ) : (
        <Pressable onPress={() => setSelectedId(-1)} style={[styles.newBtn, { backgroundColor: FACULTY_ADMIN_COLOR.tabActive }]}>
          <Text style={[type.bodyEmphasis, { color: "#fff" }]}>New request</Text>
        </Pressable>
      )}

      <View style={styles.requestsSection}>
        <Text style={[type.sectionHeader, styles.sectionLabel]}>Requests</Text>
        {requests.length === 0 ? (
          <FacultyEmptyState icon="calendar-outline" title="No requests" body="Start a schedule adjustment when you need to poll students." />
        ) : (
          <View style={[styles.requestList, { backgroundColor: native.secondaryGrouped }]}>
            {requests.map((r, index) => (
              <Pressable
                key={r.id}
                onPress={() => void loadDetail(r.id)}
                style={[
                  styles.listRow,
                  { borderBottomColor: native.separator },
                  index === requests.length - 1 && styles.listRowLast,
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={type.bodyEmphasis}>{r.section_code ?? "Course"} · {r.meeting_type}</Text>
                  <Text style={type.caption} numberOfLines={2}>{r.reason}</Text>
                </View>
                <Text style={[type.caption, styles.status]}>{formatStatusLabel(r.status)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </FacultyAdminScreen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const type = useNativeType()
  const native = useThemedNative()
  return (
    <View style={[styles.stat, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.bodyEmphasis}>{value}</Text>
    </View>
  )
}

function ActionButton({
  label,
  onPress,
  disabled,
  tone = "primary",
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  tone?: "primary" | "outline" | "danger"
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const bg =
    tone === "danger" ? "#DC2626" : tone === "outline" ? native.secondaryGrouped : FACULTY_ADMIN_COLOR.tabActive
  const ink = tone === "outline" ? native.label : "#fff"
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionBtn,
        {
          backgroundColor: bg,
          borderColor: native.separator,
          borderWidth: tone === "outline" ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {disabled && tone === "primary" ? <ActivityIndicator color="#fff" size="small" /> : null}
      <Text style={[type.bodyEmphasis, { color: ink }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  title: { marginVertical: 8 },
  notice: { padding: 12, borderRadius: 12, gap: 8, marginVertical: 8 },
  smallCta: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  statsRow: { flexDirection: "row", gap: 8, marginVertical: 8 },
  stat: { flex: 1, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  checkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#888", marginTop: 2 },
  insetCopy: { paddingHorizontal: 14, paddingVertical: 12 },
  requestsSection: { gap: 8 },
  sectionLabel: { paddingHorizontal: 4, textTransform: "none" },
  requestList: { borderRadius: 12, overflow: "hidden" },
  row: { gap: 8 },
  newBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 8 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  listRowLast: { borderBottomWidth: 0 },
  status: { maxWidth: 100, textAlign: "right", textTransform: "capitalize" },
  actionBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  pickerCard: { gap: 12, paddingVertical: 4 },
  pickerBlock: { gap: 8, paddingHorizontal: 4, paddingVertical: 8 },
  pickerRow: { flexDirection: "row", gap: 8, paddingHorizontal: 4 },
  chipRow: { flexDirection: "row", flexWrap: "nowrap", alignItems: "center", gap: 8, paddingRight: 12 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
})
