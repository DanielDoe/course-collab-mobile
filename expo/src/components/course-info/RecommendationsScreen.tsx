import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  courseInfoApi,
  formatListDate,
  purposeLabel,
  RECOMMENDATION_PURPOSES,
  type RecommendationRequest} from "../../lib/course-info-api"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"
import { StudentFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"
import { useOptionalStudentActiveCourse } from "../../context/StudentActiveCourseContext"
import { useResetOnScopeChange } from "../../hooks/use-reset-on-scope-change"
import { EmptyBlock } from "../rewards/rewards-shared"
import { COURSE_INFO_ACTION, COURSE_INFO_RECOMMENDATION } from "../../lib/course-info-color-theme"
import { InfoSectionCard, StatusBadge, statusTone, useCourseInfoTheme } from "./course-info-shared"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { FacultySummerCampDatePicker } from "../faculty/FacultySummerCampDatePicker"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "../faculty/FacultyListPagerFooter"
function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type Tab = "requests" | "new"

function RequestCard({ item, onPress }: { item: RecommendationRequest; onPress: () => void }) {
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: native.separator }}
      style={[styles.requestCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
    >
      <View style={styles.requestHead}>
        <SolidListThumbTile thumb={COURSE_INFO_RECOMMENDATION.request} icon="document-text-outline" size="compact" />
        <View style={styles.requestBody}>
          <Text style={[type.bodyEmphasis, styles.requestTitle]}>{purposeLabel(item.purpose)}</Text>
          <Text style={[type.caption, styles.requestMeta]}>
            {item.course_code ?? "Course"} · {item.instructor_name ?? "Instructor"}
          </Text>
        </View>
        <StatusBadge label={item.status.replace(/_/g, " ")} tone={statusTone(item.status)} />
      </View>
      {item.deadline ? (
        <Text style={[type.caption, styles.requestMeta]}>Deadline: {formatListDate(item.deadline)}</Text>
      ) : null}
      {item.student_request_description ? (
        <Text style={[type.secondary, styles.requestDesc]} numberOfLines={2}>
          {item.student_request_description}
        </Text>
      ) : null}
      {(item.draft_count ?? 0) > 0 ? (
        <Text style={[type.caption, styles.draftHint, { color: theme.primary }]}>
          {item.draft_count} draft(s) available on web
        </Text>
      ) : null}
    </Pressable>
  )
}

export function RecommendationsScreen() {
  const params = useLocalSearchParams<{ tab?: string; request?: string }>()
  const router = useRouter()
  const session = useStudentSession()
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const [tab, setTab] = useState<Tab>(params.tab === "new" ? "new" : "requests")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const courseKey = useOptionalStudentActiveCourse()?.activeCourse?.pickerKey
  useResetOnScopeChange(courseKey, useCallback(() => {
    setSearch("")
    setStatusFilter("all")
  }, []))
  const [requests, setRequests] = useState<RecommendationRequest[]>([])
  const [instructors, setInstructors] = useState<Array<{ id: number; name?: string; username?: string }>>([])
  const [sessions, setSessions] = useState<Array<{ id: number; code?: string; description?: string }>>([])
  const [purpose, setPurpose] = useState("scholarship")
  const [courseId, setCourseId] = useState<number | null>(null)
  const [instructorId, setInstructorId] = useState<number | null>(null)
  const [deadline, setDeadline] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [list, meta] = await Promise.all([
        courseInfoApi.getRecommendations(session),
        courseInfoApi.getRecommendationMeta(session),
      ])
      setRequests(list)
      setInstructors(meta.instructors ?? [])
      setSessions(meta.sessions ?? [])
      setCourseId((prev) => prev ?? meta.sessions?.[0]?.id ?? null)
      setInstructorId((prev) => prev ?? meta.instructors?.[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load recommendation requests.")
    }
  }, [session])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  useEffect(() => {
    if (params.tab === "new") setTab("new")
  }, [params.tab])

  useEffect(() => {
    const requestId = Number(params.request)
    if (!Number.isFinite(requestId) || requestId <= 0) return
    router.replace(`/recommendations/${requestId}`)
  }, [params.request, router])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("recommendations", onRefresh)

  async function submit() {
    if (!session || !courseId || !instructorId) {
      setError("Select a course and instructor.")
      return
    }
    setSubmitting(true)
    setMessage("")
    setError("")
    try {
      await courseInfoApi.createRecommendation(session, {
        courseId,
        instructorId,
        purpose,
        deadline: deadline.trim() || undefined,
        studentRequestDescription: description.trim() || undefined})
      setDescription("")
      setDeadline("")
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
      { id: "requests" as const, label: "My requests", icon: "folder-open-outline" as const },
      { id: "new" as const, label: "New request", icon: "add-circle-outline" as const },
    ],
    [],
  )

  const visibleRequests = useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((item) => {
      const status = item.status.replace(/_/g, " ").toLowerCase()
      if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter) return false
      if (!q) return true
      return [
        purposeLabel(item.purpose),
        item.course_code,
        item.instructor_name,
        item.status,
        item.student_request_description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [requests, search, statusFilter])

  const requestsPager = useFacultyListPager(
    visibleRequests,
    `${search}|${statusFilter}`,
    "requests",
  )

  function renderRequestsPage() {
    if (visibleRequests.length === 0) {
      return (
        <EmptyBlock
          icon="document-text-outline"
          title={search.trim() || statusFilter !== "all" ? "No matching requests" : "No requests yet"}
          body={
            search.trim() || statusFilter !== "all"
              ? "Try a different search or reset filters."
              : "Start a new request — your instructor stays in control of drafts and PDFs."
          }
        />
      )
    }

    return (
      <>
        <View style={signatureListStyles.list}>
          {requestsPager.items.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              onPress={() => router.push(`/recommendations/${item.id}` as never)}
            />
          ))}
        </View>
        <FacultyListPagerFooter pager={requestsPager} />
      </>
    )
  }

  function renderNewRequestPage() {
    return (
      <InfoSectionCard
        title="Request details"
        icon="send-outline"
        iconThumb={COURSE_INFO_RECOMMENDATION.form}
      >
        <Text style={[type.sectionHeader, styles.label]}>Purpose</Text>
        <View style={styles.chipRow}>
          {RECOMMENDATION_PURPOSES.map((opt) => (
            <Pressable
              key={opt.id}
              style={[
                styles.chip,
                { borderColor: native.separator, backgroundColor: native.fill },
                purpose === opt.id && {
                  backgroundColor: COURSE_INFO_ACTION.fill,
                  borderColor: COURSE_INFO_ACTION.fill,
                },
              ]}
              onPress={() => setPurpose(opt.id)}
            >
              <Text
                style={[
                  type.caption,
                  styles.chipText,
                  purpose === opt.id && styles.chipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[type.sectionHeader, styles.label]}>Course</Text>
        <View style={styles.optionRow}>
          {sessions.map((s) => (
            <Pressable
              key={s.id}
              style={[
                styles.optionChip,
                { borderColor: native.separator, backgroundColor: native.fill },
                courseId === s.id && {
                  borderColor: theme.primary,
                  backgroundColor: theme.soft,
                },
              ]}
              onPress={() => setCourseId(s.id)}
            >
              <Text
                style={[
                  type.caption,
                  styles.optionText,
                  courseId === s.id && { color: theme.primary, fontWeight: "700" },
                ]}
              >
                {s.code ?? s.description ?? `Course ${s.id}`}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[type.sectionHeader, styles.label]}>Instructor</Text>
        <View style={styles.optionRow}>
          {instructors.map((i) => (
            <Pressable
              key={i.id}
              style={[
                styles.optionChip,
                { borderColor: native.separator, backgroundColor: native.fill },
                instructorId === i.id && {
                  borderColor: theme.primary,
                  backgroundColor: theme.soft,
                },
              ]}
              onPress={() => setInstructorId(i.id)}
            >
              <Text
                style={[
                  type.caption,
                  styles.optionText,
                  instructorId === i.id && { color: theme.primary, fontWeight: "700" },
                ]}
              >
                {i.name ?? i.username ?? `Instructor ${i.id}`}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[type.sectionHeader, styles.label]}>Deadline</Text>
        <FacultySummerCampDatePicker
          value={deadline}
          onChange={setDeadline}
          accessibilityLabel="Deadline"
          yearPolicy="upcoming"
        />
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: native.separator, color: native.label, backgroundColor: native.fill }]}
          placeholder="Brief description for your instructor"
          accessibilityLabel="Recommendation description"
          placeholderTextColor={native.tertiaryLabel}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Pressable
          style={[styles.submitBtn, { backgroundColor: COURSE_INFO_ACTION.fill }, submitting && styles.submitBtnDisabled]}
          onPress={() => void submit()}
          disabled={submitting}
        >
          <Ionicons name="paper-plane-outline" size={16} color="#ffffff" />
          <Text style={styles.submitText}>{submitting ? "Submitting…" : "Submit request"}</Text>
        </Pressable>
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </InfoSectionCard>
    )
  }

  return (
    <>
    <StudentSearchToolbar
      value={search}
      onChange={(value) => {
        setSearch(value)
        if (value.trim()) setTab("requests")
      }}
      placeholder="Search purpose, instructor, or status…"
      filterActive={statusFilter !== "all"}
      filterLabel="Filter recommendation letters"
      onOpenFilter={() => setFilterOpen(true)}
      trailingAction={{
        onPress: () => setTab("new"),
        accessibilityLabel: "New recommendation request",
        icon: "add",
      }}
    />
    <StudentFilterSheet
      visible={filterOpen}
      title="Filter requests"
      value={statusFilter}
      onSelect={(value) => {
        setStatusFilter(value)
        setFilterOpen(false)
        setTab("requests")
      }}
      onClose={() => setFilterOpen(false)}
      options={[
        { value: "all", label: "All statuses" },
        { value: "pending", label: "Pending" },
        { value: "in_progress", label: "In progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ]}
    />
    <TabbedModuleLayout
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      error={error}
      pages={[renderRequestsPage(), renderNewRequestPage()]}
    />
    </>
  )
}

const styles = StyleSheet.create({
  requestCard: {
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  requestHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requestIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  requestBody: { flex: 1, gap: 2 },
  requestTitle: {},
  requestMeta: {},
  requestDesc: { lineHeight: 18 },
  draftHint: { fontWeight: "600" },
  label: { marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontWeight: "600" },
  chipTextActive: { color: "#ffffff" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: { fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 13,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  success: { fontSize: 13, lineHeight: 18 },
})
