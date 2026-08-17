import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { useThemedNative } from "../../context/AppearanceProvider"
import { ApiError, type OfficeHoursRequest } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { courseInfoApi, formatListDate } from "../../lib/course-info-api"
import { useNativeType } from "../../lib/themed-module-theme"
import { TabbedModuleLayout } from "../theme/TabbedModuleLayout"
import { EmptyBlock } from "../rewards/rewards-shared"
import { COURSE_INFO_ACTION, COURSE_INFO_OFFICE_HOURS } from "../../lib/course-info-color-theme"
import { InfoSectionCard, StatusBadge, statusTone, useCourseInfoTheme } from "./course-info-shared"
import { FacultySummerCampDatePicker } from "../faculty/FacultySummerCampDatePicker"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type Tab = "new" | "requests"

const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
]

function RequestRow({ req }: { req: OfficeHoursRequest }) {
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const dates =
    req.preferredDates?.length
      ? req.preferredDates.map((d) => formatListDate(String(d))).filter(Boolean).join(", ")
      : req.preferred_times

  return (
    <View style={[styles.requestRow, { borderBottomColor: native.separator }]}>
      <View style={styles.requestHead}>
        <Text style={[type.bodyEmphasis, styles.requestTitle]}>{req.topic}</Text>
        <StatusBadge label={req.status ?? "pending"} tone={statusTone(req.status)} />
      </View>
      {req.area_of_concern ? <Text style={type.caption}>Area: {req.area_of_concern}</Text> : null}
      {req.description ? (
        <Text style={[type.secondary, styles.requestBody]} numberOfLines={3}>
          {req.description}
        </Text>
      ) : null}
      <Text style={type.caption}>
        {[req.priority ? `Priority: ${req.priority}` : null, dates ? `Preferred: ${dates}` : null]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </View>
  )
}

export function OfficeHoursScreen() {
  const session = useStudentSession()
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const [tab, setTab] = useState<Tab>("new")
  const [requests, setRequests] = useState<OfficeHoursRequest[]>([])
  const [topic, setTopic] = useState("")
  const [area, setArea] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [preferredDate, setPreferredDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await courseInfoApi.getOfficeHours(session)
      setRequests(data.requests ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load requests.")
    }
  }, [session])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("office-hours", onRefresh)

  async function submit() {
    if (!session || !topic.trim()) {
      AppAlert.alert("Topic required", "Please enter what you'd like to discuss.")
      return
    }
    setSubmitting(true)
    setMessage("")
    setError("")
    try {
      await courseInfoApi.createOfficeHours(session, {
        topic: topic.trim(),
        areaOfConcern: area.trim() || undefined,
        description: description.trim() || undefined,
        priority,
        preferredDates: preferredDate.trim() ? [preferredDate.trim()] : undefined})
      setTopic("")
      setArea("")
      setDescription("")
      setPreferredDate("")
      setPriority("medium")
      setMessage("Request submitted — your instructor will review it.")
      setTab("requests")
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit request.")
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = useMemo(
    () => [
      { id: "new" as const, label: "New request", icon: "add-circle-outline" as const },
      { id: "requests" as const, label: "My requests", icon: "list-outline" as const },
    ],
    [],
  )

  function renderNewRequestPage() {
    return (
      <InfoSectionCard
        title="Request details"
        icon="create-outline"
        iconThumb={COURSE_INFO_OFFICE_HOURS.form}
        theme={theme}
      >
        <TextInput
          style={[styles.input, { borderColor: native.separator, color: native.label, backgroundColor: native.fill }]}
          placeholder="Topic *"
          accessibilityLabel="Topic"
          placeholderTextColor={native.tertiaryLabel}
          value={topic}
          onChangeText={setTopic}
        />
        <TextInput
          style={[styles.input, { borderColor: native.separator, color: native.label, backgroundColor: native.fill }]}
          placeholder="Area of concern"
          accessibilityLabel="Area of concern"
          placeholderTextColor={native.tertiaryLabel}
          value={area}
          onChangeText={setArea}
        />
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: native.separator, color: native.label, backgroundColor: native.fill }]}
          placeholder="Description"
          accessibilityLabel="Description"
          placeholderTextColor={native.tertiaryLabel}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Text style={[type.sectionHeader, styles.label]}>Preferred date</Text>
        <FacultySummerCampDatePicker
          value={preferredDate}
          onChange={setPreferredDate}
          accessibilityLabel="Preferred date"
        />
        <Text style={[type.sectionHeader, styles.label]}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((opt) => (
            <Pressable
              key={opt.id}
              style={[
                styles.priorityChip,
                { borderColor: native.separator, backgroundColor: native.fill },
                priority === opt.id && {
                  backgroundColor: COURSE_INFO_ACTION.fill,
                  borderColor: COURSE_INFO_ACTION.fill,
                },
              ]}
              onPress={() => setPriority(opt.id)}
            >
              <Text
                style={[
                  type.caption,
                  styles.priorityText,
                  priority === opt.id ? styles.priorityTextActive : null,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.submitBtn, { backgroundColor: COURSE_INFO_ACTION.fill }, submitting && styles.submitBtnDisabled]}
          onPress={() => void submit()}
          disabled={submitting}
        >
          <Ionicons name="send-outline" size={16} color="#ffffff" />
          <Text style={styles.submitText}>{submitting ? "Submitting…" : "Submit request"}</Text>
        </Pressable>
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </InfoSectionCard>
    )
  }

  function renderRequestsPage() {
    if (requests.length === 0) {
      return (
        <EmptyBlock
          icon="time-outline"
          title="No requests yet"
          body="Submit a new request when you need help from your instructor."
        />
      )
    }

    return (
      <InfoSectionCard
        title="Your requests"
        icon="folder-open-outline"
        iconThumb={COURSE_INFO_OFFICE_HOURS.requests}
        theme={theme}
      >
        {requests.map((req) => (
          <RequestRow key={req.id} req={req} />
        ))}
      </InfoSectionCard>
    )
  }

  return (
    <TabbedModuleLayout
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      error={error}
      pages={[renderNewRequestPage(), renderRequestsPage()]}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  label: { marginTop: 4 },
  priorityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  priorityText: { fontWeight: "600" },
  priorityTextActive: { color: "#ffffff" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 13,
    marginTop: 4},
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  success: { fontSize: 13, color: "#047857", lineHeight: 18 },
  requestRow: {
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  requestHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  requestTitle: { flex: 1 },
  requestBody: { lineHeight: 20 },
})
