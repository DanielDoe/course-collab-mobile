import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { AppAlert } from "../../../lib/app-alert"
import { ApiError } from "../../../lib/api"
import { useFacultyModuleHeader, useFacultyModuleNestedHeader } from "../../../context/FacultyModuleHeaderContext"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  instructorScheduleAdjustmentApi,
  type InstructorScheduleCandidate,
  type InstructorScheduleDashboard,
  type InstructorScheduleRequest,
  type LiveAvailabilityAggregate,
} from "../../../lib/instructor-schedule-adjustment-api"
import {
  DAY_CODE_LABELS,
  DAY_CODES,
  type DayCode,
  formatPollColumnLabel,
  formatStatusLabel,
  formatTime12h,
} from "../../../lib/schedule-adjustment/time-slots"
import {
  draftPayloadFromForm,
  formFromRequest,
  initialScheduleAdjustmentForm,
  type ScheduleAdjustmentFormState,
} from "../../../lib/schedule-adjustment/form-utils"
import {
  filterScheduleAdjustmentsToSection,
} from "../../../lib/schedule-adjustment/section-scope"
import { ScheduleAdjustmentStepper } from "../../schedule-adjustment/ScheduleAdjustmentStepper"
import { ScheduleAdjustmentNoticeBanner } from "../../schedule-adjustment/ScheduleAdjustmentNoticeBanner"
import { MobileAvailabilityPicker } from "../../schedule-adjustment/MobileAvailabilityPicker"
import { StudentScheduleChangeCard } from "../../schedule-adjustment/StudentScheduleChangeCard"
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
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FacultyEmptyState } from "../faculty-shared"
import { FacultyFilterSheet, FacultySearchToolbar } from "../faculty-module-shell"

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

export function FacultyScheduleAdjustmentScreen() {
  return (
    <FacultyAdminCourseGate>
      <FacultyScheduleAdjustmentContent />
    </FacultyAdminCourseGate>
  )
}

function ScheduleAdjustmentFormFields({
  form,
  setForm,
}: {
  form: ScheduleAdjustmentFormState
  setForm: React.Dispatch<React.SetStateAction<ScheduleAdjustmentFormState>>
}) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
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
      <FacultyAdminSection title="Poll settings">
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {DAY_CODES.map((day) => {
                const on = form.candidateDays.includes(day)
                return (
                  <Pressable
                    key={day}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        candidateDays: on ? f.candidateDays.filter((d) => d !== day) : [...f.candidateDays, day],
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
                  onPress={() => setForm((f) => ({ ...f, makeupDates: f.makeupDates.filter((d) => d !== date) }))}
                  style={[styles.chip, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
                >
                  <Text style={[type.caption, { color: native.label }]}>{formatPollColumnLabel(date)} ×</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </>
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
  const [liveAggregate, setLiveAggregate] = useState<LiveAvailabilityAggregate | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [cancelReason, setCancelReason] = useState("")

  const [form, setForm] = useState<ScheduleAdjustmentFormState>(initialScheduleAdjustmentForm)

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
    const data = await instructorScheduleAdjustmentApi.list(scope, { includeArchived: showArchived })
    setRequests(data.requests ?? [])
  }, [scope, showArchived])

  const loadDetail = useCallback(
    async (id: number) => {
      if (!scope) return
      setSelectedId(id)
      try {
        const [main, cand, aggregateRes] = await Promise.all([
          instructorScheduleAdjustmentApi.getDashboard(scope, id),
          instructorScheduleAdjustmentApi.getCandidates(scope, id),
          instructorScheduleAdjustmentApi.getAggregate(scope, id),
        ])
        setDetail(main)
        setCandidates(cand.candidates ?? [])
        setLiveAggregate(aggregateRes.aggregate ?? null)
      } catch (err) {
        setDetail(null)
        setLiveAggregate(null)
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

  const sectionRequests = useMemo(
    () => filterScheduleAdjustmentsToSection(requests, scope?.sessionCode),
    [requests, scope?.sessionCode],
  )

  useEffect(() => {
    if (!scope?.sessionCode || !selectedId || selectedId <= 0) return
    const active = sectionRequests.some((row) => row.id === selectedId)
    if (!active) {
      setSelectedId(null)
      setDetail(null)
      setCandidates([])
      setLiveAggregate(null)
    }
  }, [scope?.sessionCode, sectionRequests, selectedId])

  useEffect(() => {
    const req = detail?.request
    if (!req || req.status !== "DRAFT") return
    setForm(formFromRequest(req as Record<string, unknown>))
  }, [detail])

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

  const validateForm = () => {
    if (!form.reason.trim() || !form.deadlineDate) {
      AppAlert.alert("Missing fields", "Reason and a poll deadline are required.")
      return false
    }
    if (form.pollKind === "recurring" && form.candidateDays.length === 0) {
      AppAlert.alert("Missing days", "Select at least one weekday to poll.")
      return false
    }
    if (form.pollKind === "one_off" && (!form.missedClassDate || form.makeupDates.length === 0)) {
      AppAlert.alert("Missing dates", "Choose the missed class date and at least one makeup date.")
      return false
    }
    return true
  }

  const createRequest = async () => {
    if (!scope || !validateForm()) return
    setCreating(true)
    try {
      const data = await instructorScheduleAdjustmentApi.create(scope, {
        ...draftPayloadFromForm(form),
        ...(scope.sessionId ? { sectionId: scope.sessionId } : {}),
      })
      const id = data.request?.id
      AppAlert.alert("Draft saved", "Start the poll when you are ready.")
      setForm(initialScheduleAdjustmentForm)
      await loadList()
      if (id) await loadDetail(id)
      else {
        setSelectedId(null)
        setDetail(null)
      }
    } catch (err) {
      AppAlert.alert("Error", err instanceof ApiError ? err.message : "Create failed.")
    } finally {
      setCreating(false)
    }
  }

  const saveDraftChanges = async () => {
    if (!scope || !selectedId || !validateForm()) return
    setSaving(true)
    try {
      await instructorScheduleAdjustmentApi.action(scope, selectedId, {
        action: "update",
        ...draftPayloadFromForm(form),
      })
      AppAlert.alert("Saved", "Draft updated.")
      await loadDetail(selectedId)
      await loadList()
    } catch (err) {
      AppAlert.alert("Error", err instanceof ApiError ? err.message : "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  const deleteDraft = async () => {
    if (!selectedId) return
    AppAlert.alert("Delete draft?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await instructorScheduleAdjustmentApi.action(scope!, selectedId, { action: "delete" })
              AppAlert.alert("Deleted", "Draft removed.")
              goToAllRequests()
              await loadList()
            } catch (err) {
              AppAlert.alert("Error", err instanceof ApiError ? err.message : "Delete failed.")
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  const request = detail?.request
  const consent = detail?.consent
  const enrollmentDelta = detail?.enrollmentDelta

  const { setNestedHeader } = useFacultyModuleHeader()
  const goToAllRequests = useCallback(() => {
    setNestedHeader(null)
    setSelectedId(null)
    setDetail(null)
    setCandidates([])
    setLiveAggregate(null)
    setForm(initialScheduleAdjustmentForm)
  }, [setNestedHeader])

  useFacultyModuleNestedHeader({
    active: selectedId != null,
    title: "Schedule Adjustment",
    onBack: goToAllRequests,
  })

  const showingDetail = Boolean(selectedId && selectedId > 0 && request)
  const showingList = !showingDetail && selectedId !== -1
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sectionRequests
    return sectionRequests.filter((r) => {
      const hay = [
        r.section_code,
        r.meeting_type,
        r.reason,
        formatStatusLabel(r.status),
        r.archived_at ? "archived" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [sectionRequests, search])
  const cancellable =
    request &&
    !["COMPLETED", "FINALIZED", "CANCELLED"].includes(request.status) &&
    !request.archived_at

  return (
    <>
    {showingList ? (
      <FacultySearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search requests…"
        filterActive={showArchived}
        filterLabel={showArchived ? "Archived" : "Active"}
        onOpenFilter={() => setFilterSheetOpen(true)}
      />
    ) : null}
    <FacultyAdminScreen
      loading={!showingDetail && loading}
      refreshing={refreshing}
      error={showingDetail ? null : error || null}
      onRefresh={onRefresh}
    >
      {showingDetail && request ? (
        <>
          <ScheduleAdjustmentNoticeBanner />

          <Text style={[type.sheetTitle, styles.title]}>{request.reason}</Text>
          <ScheduleAdjustmentStepper status={request.status} />

          {request.proposed_day || request.proposed_start_time ? (
            <StudentScheduleChangeCard request={request as Record<string, unknown>} />
          ) : null}

          {request.status === "CANCELLED" ? (
            <ActionButton
              label="Reactivate request"
              disabled={saving}
              onPress={() => void postAction({ action: "reactivate" })}
            />
          ) : null}

          {request.status === "DRAFT" ? (
            <>
              <View style={styles.row}>
                <ActionButton
                  label="Start availability poll"
                  disabled={saving}
                  onPress={() => void postAction({ action: "start_availability" })}
                />
                <ActionButton label="Save changes" tone="outline" disabled={saving} onPress={() => void saveDraftChanges()} />
              </View>
              <ActionButton label="Delete draft" tone="danger" disabled={saving} onPress={() => void deleteDraft()} />
              <FacultyAdminSection title="Edit draft settings">
                <ScheduleAdjustmentFormFields form={form} setForm={setForm} />
              </FacultyAdminSection>
            </>
          ) : null}

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

          {request.status === "COLLECTING_AVAILABILITY" ? (
            <>
              <View style={styles.row}>
                <ActionButton
                  label="Close poll and analyze"
                  disabled={saving}
                  onPress={() => {
                    AppAlert.alert(
                      "Close availability poll?",
                      "Students will no longer submit availability. Candidate analysis will run.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Close poll",
                          style: "destructive",
                          onPress: () => void postAction({ action: "close_availability" }),
                        },
                      ],
                    )
                  }}
                />
                <ActionButton
                  label="Remind students"
                  tone="outline"
                  disabled={saving}
                  onPress={() => void postAction({ action: "remind_availability" })}
                />
              </View>
              {liveAggregate ? (
                <FacultyAdminSection title="Live availability heatmap">
                  <Text style={[type.caption, styles.insetCopy]}>
                    {liveAggregate.responded} of {liveAggregate.totalEnrolled} students responded. Darker cells show
                    times more students marked.
                  </Text>
                  <MobileAvailabilityPicker
                    candidateDays={liveAggregate.candidateDays ?? []}
                    timeSlots={liveAggregate.timeSlots ?? []}
                    mode="binary"
                    value={{}}
                    onChange={() => {}}
                    readOnly
                    slotHeatmap={liveAggregate.slotHeatmap}
                    totalEnrolled={liveAggregate.totalEnrolled}
                    topWindows={liveAggregate.topWindows}
                    meetingDurationMinutes={liveAggregate.meetingDurationMinutes}
                  />
                </FacultyAdminSection>
              ) : null}
            </>
          ) : null}

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
                        {
                          borderBottomColor: native.separator,
                          backgroundColor: c.selected ? "rgba(16,185,129,0.12)" : undefined,
                        },
                        index === candidates.length - 1 && styles.listRowLast,
                      ]}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={type.bodyEmphasis}>
                          {formatPollColumnLabel(c.day_of_week)} {formatTime12h(c.start_time)} –{" "}
                          {formatTime12h(c.end_time)}
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
                <FacultyAdminTextField
                  label="Approved by"
                  value={deptForm.approvedBy}
                  onChangeText={(v) => setDeptForm((f) => ({ ...f, approvedBy: v }))}
                />
                <FacultyAdminTextField
                  label="Building"
                  value={deptForm.building}
                  onChangeText={(v) => setDeptForm((f) => ({ ...f, building: v }))}
                />
                <FacultyAdminTextField
                  label="Room"
                  value={deptForm.room}
                  onChangeText={(v) => setDeptForm((f) => ({ ...f, room: v }))}
                />
                <FacultyAdminTextField
                  label="Notes"
                  value={deptForm.notes}
                  onChangeText={(v) => setDeptForm((f) => ({ ...f, notes: v }))}
                  multiline
                  isLast
                />
              </FacultyAdminSection>
              <View style={styles.pickerCard}>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>Effective date</Text>
                <FacultySummerCampDatePicker
                  value={deptForm.effectiveDate}
                  onChange={(v) => setDeptForm((f) => ({ ...f, effectiveDate: v }))}
                  accessibilityLabel="Effective date"
                />
              </View>
              <Pressable
                onPress={() => setDeptForm((f) => ({ ...f, confirmationChecked: !f.confirmationChecked }))}
                style={styles.checkRow}
              >
                <View
                  style={[styles.checkbox, deptForm.confirmationChecked && { backgroundColor: FACULTY_ADMIN_COLOR.tabActive }]}
                />
                <Text style={[type.caption, { flex: 1 }]}>I confirm department approval and classroom availability.</Text>
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
                    notes: deptForm.notes,
                    confirmationChecked: deptForm.confirmationChecked,
                  })
                }
              />
              {request.status === "DEPARTMENT_APPROVED" ? (
                <ActionButton
                  label="Start consent collection"
                  disabled={saving}
                  onPress={() => void postAction({ action: "start_consent" })}
                />
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
                <ActionButton
                  label="Send consent reminder"
                  disabled={saving}
                  onPress={() => void postAction({ action: "remind_consent" })}
                />
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

          {cancellable ? (
            <>
              <FacultyAdminTextField
                label="Cancellation reason"
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Why is this request being cancelled?"
                multiline
              />
              <ActionButton
                label="Cancel request"
                tone="danger"
                disabled={saving || !cancelReason.trim()}
                onPress={() => {
                  AppAlert.alert(
                    "Cancel this request?",
                    "Enrolled students will be notified and the original class schedule will remain unchanged.",
                    [
                      { text: "Keep request", style: "cancel" },
                      {
                        text: "Cancel request",
                        style: "destructive",
                        onPress: () => void postAction({ action: "cancel", reason: cancelReason.trim() }),
                      },
                    ],
                  )
                }}
              />
            </>
          ) : null}

          {request.archived_at ? (
            <ActionButton
              label="Restore from archive"
              tone="outline"
              disabled={saving}
              onPress={() => void postAction({ action: "unarchive" })}
            />
          ) : !["COLLECTING_AVAILABILITY", "COLLECTING_CONSENT"].includes(request.status) ? (
            <ActionButton
              label="Archive"
              tone="outline"
              disabled={saving}
              onPress={() => void postAction({ action: "archive" })}
            />
          ) : null}
        </>
      ) : (
        <>
          <ScheduleAdjustmentNoticeBanner />

          {selectedId === -1 ? (
            <>
              <ScheduleAdjustmentFormFields form={form} setForm={setForm} />
              <View style={styles.row}>
                <ActionButton
                  label={creating ? "Saving…" : "Save draft"}
                  disabled={creating}
                  onPress={() => void createRequest()}
                />
                <ActionButton label="Cancel" tone="outline" onPress={goToAllRequests} />
              </View>
            </>
          ) : (
            <Pressable
              onPress={() => setSelectedId(-1)}
              style={[styles.newBtn, { backgroundColor: FACULTY_ADMIN_COLOR.tabActive }]}
            >
              <Text style={[type.bodyEmphasis, { color: "#fff" }]}>New request</Text>
            </Pressable>
          )}

          <View style={styles.requestsSection}>
            <Text style={[type.sectionHeader, styles.sectionLabel]}>Requests</Text>
            {filteredRequests.length === 0 ? (
              <FacultyEmptyState
                icon={search.trim() ? "search-outline" : "calendar-outline"}
                title={search.trim() ? "No matches" : "No requests"}
                body={
                  search.trim()
                    ? "Try a different search or include archived requests from the filter."
                    : "Start a schedule adjustment when you need to poll students."
                }
              />
            ) : (
              <View style={[styles.requestList, { backgroundColor: native.secondaryGrouped }]}>
                {filteredRequests.map((r, index) => (
                  <Pressable
                    key={r.id}
                    onPress={() => void loadDetail(r.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.section_code ?? "Course"} ${r.meeting_type}. ${formatStatusLabel(r.status)}`}
                    accessibilityHint="Opens this schedule adjustment request"
                    android_ripple={Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined}
                    style={({ pressed }) => [
                      styles.listRow,
                      { borderBottomColor: native.separator },
                      index === filteredRequests.length - 1 && styles.listRowLast,
                      pressed && { opacity: NATIVE.pressedOpacity },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={type.bodyEmphasis}>
                        {r.section_code ?? "Course"} · {r.meeting_type}
                        {r.archived_at ? " · archived" : ""}
                      </Text>
                      <Text style={type.caption} numberOfLines={2}>
                        {r.reason}
                      </Text>
                    </View>
                    <Text style={[type.caption, styles.status]}>{formatStatusLabel(r.status)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </FacultyAdminScreen>
    <FacultyFilterSheet
      visible={filterSheetOpen}
      title="Requests"
      subtitle="Include archived polls in this list."
      value={showArchived ? "archived" : "active"}
      options={[
        { value: "active", label: "Active requests" },
        { value: "archived", label: "Include archived" },
      ]}
      onSelect={(value) => setShowArchived(value === "archived")}
      onClose={() => setFilterSheetOpen(false)}
    />
    </>
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
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60,60,67,0.29)",
    marginTop: 2,
  },
})
