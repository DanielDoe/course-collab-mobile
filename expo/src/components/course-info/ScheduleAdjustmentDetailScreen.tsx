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
import { useRouter } from "expo-router"
import { AppAlert } from "../../lib/app-alert"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  scheduleAdjustmentApi,
  type ScheduleAdjustmentDetail,
} from "../../lib/schedule-adjustment-api"
import {
  formatPollColumnLabel,
  formatTime12h,
  type AvailabilitySlotState,
} from "../../lib/schedule-adjustment/time-slots"
import { ScheduleAdjustmentStepper } from "../schedule-adjustment/ScheduleAdjustmentStepper"
import { ScheduleAdjustmentNoticeBanner } from "../schedule-adjustment/ScheduleAdjustmentNoticeBanner"
import { MobileAvailabilityPicker } from "../schedule-adjustment/MobileAvailabilityPicker"
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
  const router = useRouter()
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const pad = useModuleScrollContentPadding()
  const [detail, setDetail] = useState<ScheduleAdjustmentDetail | null>(null)
  const [gridDays, setGridDays] = useState<string[]>([])
  const [gridTimes, setGridTimes] = useState<string[]>([])
  const [gridMode, setGridMode] = useState<"binary" | "ternary">("binary")
  const [slots, setSlots] = useState<Record<string, AvailabilitySlotState>>({})
  const [signatureName, setSignatureName] = useState("")
  const [acknowledged, setAcknowledged] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [d, g] = await Promise.all([
        scheduleAdjustmentApi.getDetail(session, requestId),
        scheduleAdjustmentApi.getAvailabilityGrid(session, requestId),
      ])
      setDetail(d)
      setGridDays(g.candidateDays ?? [])
      setGridTimes(g.timeSlots ?? [])
      setGridMode(g.availabilityMode ?? "binary")
      const existing = d.myAvailability?.availability_data?.slots
      if (existing) setSlots(existing)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load request.")
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
    setSaving(true)
    try {
      await scheduleAdjustmentApi.submitConsent(session, requestId, {
        agreed,
        acknowledged,
        signatureName,
        declineReason,
        declineCategory: "other",
      })
      AppAlert.alert("Recorded", agreed ? "Consent recorded." : "Response recorded.")
      await load()
    } catch (err) {
      AppAlert.alert("Error", err instanceof ApiError ? err.message : "Consent failed.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  if (error || !detail?.request) {
    return (
      <View style={styles.center}>
        <Text style={type.secondary}>{error || "Request not found."}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: theme.primary }}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  const request = detail.request
  const status = request.status
  const pollStats = detail.pollStats

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: native.groupedBackground }}
      contentContainerStyle={[styles.content, pad]}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={[type.caption, { color: theme.primary }]}>← Schedule adjustments</Text>
      </Pressable>

      <ScheduleAdjustmentNoticeBanner />
      <Text style={[type.sheetTitle, styles.title]}>{request.reason}</Text>
      <ScheduleAdjustmentStepper status={status} />

      {status === "COLLECTING_AVAILABILITY" ? (
        <InfoSectionCard title="Your availability" icon="time-outline">
          <Text style={[type.caption, { marginBottom: 8 }]}>
            {request.poll_kind === "one_off"
              ? `Makeup poll for the missed class on ${request.missed_class_date ?? ""}.`
              : "Mark your weekly availability on the selected days."}
          </Text>
          <Text style={type.caption}>
            {pollStats?.responded ?? 0} of {pollStats?.enrolled ?? 0} students responded
          </Text>
          <MobileAvailabilityPicker
            candidateDays={gridDays}
            timeSlots={gridTimes}
            mode={gridMode}
            value={slots}
            onChange={setSlots}
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

      {status === "COLLECTING_CONSENT" ? (
        <InfoSectionCard title="Schedule change consent" icon="document-text-outline">
          <View style={styles.compare}>
            <View style={styles.compareCol}>
              <Text style={type.caption}>Current</Text>
              <Text style={type.secondary}>
                {(request.original_schedules as { lecture?: { scheduleText?: string } })?.lecture?.scheduleText ??
                  "See syllabus"}
              </Text>
            </View>
            <View style={styles.compareCol}>
              <Text style={type.caption}>Proposed</Text>
              <Text style={type.secondary}>
                {formatPollColumnLabel(String(request.proposed_day ?? request.proposed_date ?? ""))}{" "}
                {request.proposed_start_time ? formatTime12h(request.proposed_start_time) : ""} –{" "}
                {request.proposed_end_time ? formatTime12h(request.proposed_end_time) : ""}
              </Text>
              <Text style={type.caption}>Effective: {request.effective_date ?? ""}</Text>
            </View>
          </View>
          <Text style={[type.secondary, styles.consentText]}>{detail.consentStatement}</Text>
          {detail.conflictDisclaimer ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]}>{detail.conflictDisclaimer}</Text>
          ) : null}

          {detail.myConsent?.status === "agreed" ? (
            <Text style={[type.bodyEmphasis, { color: "#047857" }]}>You have agreed to this schedule change.</Text>
          ) : (
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
                onPress={() => void submitConsent(false)}
                style={[styles.ctaOutline, { borderColor: native.separator }]}
              >
                <Text style={type.bodyEmphasis}>Submit disagreement</Text>
              </Pressable>
            </>
          )}
        </InfoSectionCard>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { padding: 16, gap: 16 },
  title: { marginTop: 8 },
  compare: { flexDirection: "row", gap: 12 },
  compareCol: { flex: 1, gap: 6 },
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
  backBtn: { marginTop: 12 },
})
