import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  scheduleAdjustmentApi,
  type ScheduleAdjustmentDetail,
  type SlotHeatmapCell,
  type TopMeetingWindow,
} from "../../lib/schedule-adjustment-api"
import { scheduleAdjustmentMatchesSection } from "../../lib/schedule-adjustment/section-scope"
import {
  formatPollColumnLabel,
  formatTime12h,
  type AvailabilitySlotState,
} from "../../lib/schedule-adjustment/time-slots"
import { ScheduleAdjustmentStepper } from "../schedule-adjustment/ScheduleAdjustmentStepper"
import { ConsentProgressCard, bumpConsentStats } from "../schedule-adjustment/ConsentProgressCard"
import { ScheduleAdjustmentNoticeBanner } from "../schedule-adjustment/ScheduleAdjustmentNoticeBanner"
import { MobileAvailabilityPicker } from "../schedule-adjustment/MobileAvailabilityPicker"
import { StudentScheduleChangeCard } from "../schedule-adjustment/StudentScheduleChangeCard"
import { ProposedArrangementCard } from "../schedule-adjustment/ProposedArrangementCard"
import {
  DIRECT_PROPOSAL_CONSENT_INTRO,
  formatMeetingWindow,
  isDirectProposal,
} from "../../lib/schedule-adjustment/arrangement"
import { InfoSectionCard, useCourseInfoTheme } from "./course-info-shared"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { COURSE_INFO_ACTION } from "../../lib/course-info-color-theme"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function ScheduleAdjustmentDetailScreen({ requestId }: { requestId: number }) {
  const session = useStudentSession()
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const pad = useModuleScrollContentPadding()
  const [detail, setDetail] = useState<ScheduleAdjustmentDetail | null>(null)
  const [gridDays, setGridDays] = useState<string[]>([])
  const [gridTimes, setGridTimes] = useState<string[]>([])
  const [gridMode, setGridMode] = useState<"binary" | "ternary">("binary")
  const [meetingDurationMinutes, setMeetingDurationMinutes] = useState(60)
  const [slotHeatmap, setSlotHeatmap] = useState<Record<string, SlotHeatmapCell> | null>(null)
  const [topWindows, setTopWindows] = useState<TopMeetingWindow[] | null>(null)
  const [enrolledTotal, setEnrolledTotal] = useState(0)
  const [slots, setSlots] = useState<Record<string, AvailabilitySlotState>>({})
  const [signatureName, setSignatureName] = useState("")
  const [acknowledged, setAcknowledged] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!session) return
    if (!opts?.soft) setError("")
    try {
      const d = await scheduleAdjustmentApi.getDetail(session, requestId)
      if (!scheduleAdjustmentMatchesSection(d.request?.section_code, session.section)) {
        setDetail(null)
        setError("This schedule adjustment belongs to another section.")
        return
      }
      setDetail(d)
      if (d.myConsent?.status === "agreed") {
        setAcknowledged(true)
        if (d.myConsent.signature_name) setSignatureName(String(d.myConsent.signature_name))
      }

      try {
        const g = await scheduleAdjustmentApi.getAvailabilityGrid(session, requestId)
        setGridDays(g.candidateDays ?? [])
        setGridTimes(g.timeSlots ?? [])
        setGridMode(g.availabilityMode ?? "binary")
        setMeetingDurationMinutes(g.meetingDurationMinutes ?? 60)
        setSlotHeatmap(g.slotHeatmap ?? null)
        setTopWindows(g.topWindows ?? null)
        setEnrolledTotal(Number(g.pollStats?.enrolled ?? d.pollStats?.enrolled ?? 0))
        const existing = d.myAvailability?.availability_data?.slots
        if (existing) setSlots(existing)
      } catch {
        setEnrolledTotal(Number(d.pollStats?.enrolled ?? 0))
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load request."
      if (opts?.soft) {
        AppAlert.alert("Could not refresh", message)
      } else {
        setError(message)
      }
    }
  }, [session, requestId])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const submitAvailability = async () => {
    if (!session) return
    setSaving(true)
    try {
      await scheduleAdjustmentApi.submitAvailability(session, requestId, slots)
      AppAlert.alert("Submitted", "Your availability has been saved.")
      await load()
    } catch (err) {
      AppAlert.alert("Error", err instanceof ApiError ? err.message : "Submit failed.")
    } finally {
      setSaving(false)
    }
  }

  const submitConsent = async (agreed: boolean) => {
    if (!session) return
    if (!agreed && !declineReason.trim()) {
      AppAlert.alert("Missing explanation", "A brief explanation is required to record disagreement.")
      return
    }
    setSaving(true)
    try {
      await scheduleAdjustmentApi.submitConsent(session, requestId, {
        agreed,
        acknowledged,
        signatureName,
        declineReason,
        declineCategory: agreed ? undefined : "concern",
      })
      if (agreed) {
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                myConsent: {
                  status: "agreed",
                  signature_name: signatureName.trim(),
                },
                consentStats: prev.consentStats ? bumpConsentStats(prev.consentStats) : prev.consentStats,
              }
            : prev,
        )
      }
      AppAlert.alert("Recorded", agreed ? "Consent recorded." : "Response recorded.")
      await load({ soft: true })
    } catch (err) {
      AppAlert.alert("Error", err instanceof ApiError ? err.message : "Consent failed.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </View>
    )
  }

  if (error || !detail?.request) {
    return (
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <View style={styles.center}>
          <Text style={type.secondary}>{error || "Request not found."}</Text>
        </View>
      </View>
    )
  }

  const request = detail.request
  const status = request.status
  const pollStats = detail.pollStats
  const topWindow = topWindows?.[0]
  const consentPhaseStatuses = [
    "COLLECTING_CONSENT",
    "CONSENT_COMPLETE",
    "READY_TO_FINALIZE",
    "FINALIZED",
    "COMPLETED",
  ]
  const showConsentSection =
    consentPhaseStatuses.includes(status) ||
    detail.myConsent?.status === "agreed" ||
    detail.myConsent?.status === "concern" ||
    detail.myConsent?.status === "declined"

  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: pad.paddingTop, paddingBottom: pad.paddingBottom },
        ]}
      >
      <ScheduleAdjustmentNoticeBanner />
      <Text style={[type.sheetTitle, styles.title]}>{request.reason}</Text>
      <ScheduleAdjustmentStepper status={status} adjustmentMode={request.adjustment_mode} />

      {detail.consentStats && consentPhaseStatuses.includes(status) ? (
        <ConsentProgressCard stats={detail.consentStats} requestStatus={status} />
      ) : null}

      {isDirectProposal(request.adjustment_mode) ? (
        <ProposedArrangementCard request={request} />
      ) : (
        <StudentScheduleChangeCard request={request as Record<string, unknown>} consentStatus={detail.myConsent?.status} />
      )}

      {status === "COLLECTING_AVAILABILITY" && !isDirectProposal(request.adjustment_mode) ? (
        <InfoSectionCard title="Your availability" icon="time-outline">
          <Text style={[type.caption, { marginBottom: 8 }]}>
            {request.poll_kind === "one_off"
              ? `Makeup poll for the missed class on ${request.missed_class_date ?? ""}.`
              : "Mark your weekly availability on the selected days."}
          </Text>
          <Text style={[type.caption, { marginBottom: 8 }]}>
            {pollStats?.responded ?? 0} of {pollStats?.enrolled ?? enrolledTotal} students responded
          </Text>
          {topWindow ? (
            <View style={[styles.likelyCard, { backgroundColor: "rgba(124,58,237,0.1)", borderColor: native.separator }]}>
              <Text style={type.bodyEmphasis}>Likely proposed schedule</Text>
              <Text style={type.secondary}>
                {formatPollColumnLabel(topWindow.dayOfWeek)} {formatTime12h(topWindow.startTime)} –{" "}
                {formatTime12h(topWindow.endTime)}
              </Text>
              <Text style={type.caption}>
                {topWindow.availableCount} of {enrolledTotal || pollStats?.enrolled || 0} available (
                {topWindow.agreementPercentage}%)
              </Text>
            </View>
          ) : null}
          <MobileAvailabilityPicker
            candidateDays={gridDays}
            timeSlots={gridTimes}
            mode={gridMode}
            value={slots}
            onChange={setSlots}
            slotHeatmap={slotHeatmap}
            totalEnrolled={enrolledTotal || pollStats?.enrolled || 0}
            topWindows={topWindows}
            meetingDurationMinutes={meetingDurationMinutes}
          />
          <Pressable
            disabled={saving}
            onPress={() => void submitAvailability()}
            style={[styles.cta, { backgroundColor: COURSE_INFO_ACTION.fill }]}
          >
            <Text style={[type.bodyEmphasis, { color: COURSE_INFO_ACTION.ink }]}>
              {saving ? "Saving…" : "Submit availability"}
            </Text>
          </Pressable>
        </InfoSectionCard>
      ) : null}

      {showConsentSection ? (
        <InfoSectionCard title="Schedule change consent" icon="document-text-outline">
          <Text style={[type.secondary, styles.consentText]}>
            {detail.consentIntro ?? (isDirectProposal(request.adjustment_mode) ? DIRECT_PROPOSAL_CONSENT_INTRO : detail.consentStatement)}
          </Text>
          {Array.isArray(detail.consentAffirmations) ? (
            detail.consentAffirmations.map((line) => (
              <Text key={line} style={[type.caption, { marginTop: 4 }]}>
                • {line}
              </Text>
            ))
          ) : null}
          {detail.conflictDisclaimer ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]}>{detail.conflictDisclaimer}</Text>
          ) : null}

          {isDirectProposal(request.adjustment_mode) ? (
            <View style={[styles.likelyCard, { backgroundColor: "rgba(124,58,237,0.08)", borderColor: native.separator }]}>
              <Text style={type.caption}>
                <Text style={type.bodyEmphasis}>Instructor led: </Text>
                {formatMeetingWindow({
                  day: request.instructor_led_day,
                  startTime: request.instructor_led_start_time,
                  endTime: request.instructor_led_end_time,
                })}
              </Text>
              <Text style={[type.caption, { marginTop: 6 }]}>
                <Text style={type.bodyEmphasis}>Structured session: </Text>
                {formatMeetingWindow({
                  day: request.structured_session_day,
                  startTime: request.structured_session_start_time,
                  endTime: request.structured_session_end_time,
                })}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 6 }]}>
                Check in within the first {Number(request.attendance_late_threshold_minutes ?? 20) || 20} minutes to be
                marked Present during structured sessions.
              </Text>
            </View>
          ) : null}

          {detail.myConsent?.status === "agreed" ? (
            <Text style={[type.bodyEmphasis, { color: "#047857", marginTop: 8 }]}>
              You have agreed to this schedule change.
            </Text>
          ) : detail.myConsent?.status === "concern" || detail.myConsent?.status === "declined" ? (
            <Text style={[type.bodyEmphasis, { color: "#b45309" }]}>
              Your concern has been recorded. This is not treated as consent.
            </Text>
          ) : status === "COLLECTING_CONSENT" ? (
            <>
              <Pressable onPress={() => setAcknowledged((v) => !v)} style={styles.checkRow}>
                <View style={[styles.checkbox, acknowledged && { backgroundColor: theme.primary }]} />
                <Text style={[type.secondary, { flex: 1 }]}>I acknowledge the consent statement above.</Text>
              </Pressable>
              <Text style={type.caption}>Type your full name</Text>
              <TextInput
                value={signatureName}
                onChangeText={setSignatureName}
                style={[styles.input, { borderColor: native.separator, color: native.label }]}
                placeholder="Full name"
                placeholderTextColor={native.tertiaryLabel}
              />
              <Pressable
                disabled={!acknowledged || !signatureName.trim() || saving}
                onPress={() => void submitConsent(true)}
                style={[styles.cta, { backgroundColor: COURSE_INFO_ACTION.fill, opacity: !acknowledged ? 0.5 : 1 }]}
              >
                <Text style={[type.bodyEmphasis, { color: COURSE_INFO_ACTION.ink }]}>Agree and Sign</Text>
              </Pressable>
              <Text style={[type.caption, { marginTop: 12 }]}>I cannot agree</Text>
              <TextInput
                value={declineReason}
                onChangeText={setDeclineReason}
                style={[styles.input, { borderColor: native.separator, color: native.label }]}
                placeholder="Brief explanation"
                placeholderTextColor={native.tertiaryLabel}
                multiline
              />
              <Pressable
                disabled={!declineReason.trim() || saving}
                onPress={() => void submitConsent(false)}
                style={[
                  styles.ctaOutline,
                  { borderColor: native.separator, opacity: !declineReason.trim() ? 0.5 : 1 },
                ]}
              >
                <Text style={type.bodyEmphasis}>Submit disagreement</Text>
              </Pressable>
            </>
          ) : null}
        </InfoSectionCard>
      ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 18,
  },
  title: { marginTop: 8 },
  likelyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginBottom: 8,
  },
  consentText: { marginVertical: 8, lineHeight: 20 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginVertical: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#888",
    marginTop: 2,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  cta: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  ctaOutline: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
})
