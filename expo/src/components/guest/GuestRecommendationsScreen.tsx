import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ModuleSection } from "../modules/ModuleScreen"
import { NativeSelect } from "../NativeSelect"
import { useSession } from "../../context/SessionProvider"
import { useThemedNative } from "../../context/AppearanceProvider"
import { ApiError } from "../../lib/api"
import { guestApi } from "../../lib/guest-api"
import {
  RECOMMENDATION_PURPOSES,
  type RecommendationRequest,
} from "../../lib/course-info-api"
import {
  dedupeGuestCourseOptions,
  dedupeGuestInstructors,
  guestCourseLabel,
  guestInstructorLabel,
  pickDefaultGuestCourseId,
} from "../../lib/guest-form-utils"
import type { GuestSession } from "../../lib/session"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"
import { EmptyBlock } from "../rewards/rewards-shared"
import { InfoSectionCard } from "../course-info/course-info-shared"
import { useNativeType } from "../../lib/themed-module-theme"
import { useGuestModuleTheme } from "./guest-shared"
import { GuestLetterRequestCard } from "./GuestLetterRequestCard"
import { GuestLetterSearchBar } from "./GuestLetterSearchBar"
import {
  countGuestLettersByFilter,
  filterGuestLetters,
  type GuestLetterFilter,
} from "../../lib/guest-recommendation-utils"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

type Tab = "requests" | "new"

export function GuestRecommendationsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ tab?: string }>()
  const { session } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const theme = useGuestModuleTheme()
  const native = useThemedNative()
  const type = useNativeType()

  const [tab, setTab] = useState<Tab>(params.tab === "new" ? "new" : "requests")
  const [requests, setRequests] = useState<RecommendationRequest[]>([])
  const [rawSessions, setRawSessions] = useState<Array<{ id: number; code?: string; description?: string }>>([])
  const [rawInstructors, setRawInstructors] = useState<Array<{ id: number; name?: string; username?: string }>>([])
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
  const [search, setSearch] = useState("")
  const [letterFilter, setLetterFilter] = useState<GuestLetterFilter>("all")

  const courseOptions = useMemo(() => dedupeGuestCourseOptions(rawSessions), [rawSessions])
  const instructorOptions = useMemo(() => dedupeGuestInstructors(rawInstructors), [rawInstructors])

  const load = useCallback(async () => {
    if (!guestSession) return
    setError("")
    try {
      const [list, meta] = await Promise.all([
        guestApi.getRecommendations(guestSession),
        guestApi.getRecommendationMeta(guestSession),
      ])
      setRequests(list)
      setRawSessions(meta.sessions ?? [])
      setRawInstructors(meta.instructors ?? [])
      const courses = dedupeGuestCourseOptions(meta.sessions ?? [])
      const defaultCourse = pickDefaultGuestCourseId(courses)
      setCourseId((prev) => prev ?? defaultCourse)
      setInstructorId((prev) => prev ?? meta.instructors?.[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load recommendation requests.")
    }
  }, [guestSession])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("recommendations", onRefresh)

  useEffect(() => {
    if (params.tab === "new") setTab("new")
  }, [params.tab])

  const filterCounts = useMemo(() => countGuestLettersByFilter(requests), [requests])

  const filterOptions = useMemo(
    () =>
      [
        { id: "all" as const, label: "All" },
        { id: "needs_you" as const, label: "Needs you" },
        { id: "in_progress" as const, label: "In progress" },
        { id: "done" as const, label: "Completed" },
      ].map((opt) => ({ ...opt, count: filterCounts[opt.id] })),
    [filterCounts],
  )

  const filteredRequests = useMemo(
    () => filterGuestLetters(requests, letterFilter, search),
    [requests, letterFilter, search],
  )

  async function submit() {
    if (!guestSession || !courseId || !instructorId) {
      setError("Select a course and instructor.")
      return
    }
    setSubmitting(true)
    setMessage("")
    setError("")
    try {
      const created = await guestApi.createRecommendation(guestSession, {
        courseId,
        instructorId,
        purpose,
        deadline: deadline.trim() || undefined,
        studentRequestDescription: description.trim() || undefined,
      })
      setDescription("")
      setDeadline("")
      setMessage("Request submitted — your instructor will review it.")
      setTab("requests")
      await load()
      const newId = (created as { request?: { id?: number }; id?: number }).request?.id ?? (created as { id?: number }).id
      if (typeof newId === "number") {
        router.push(`/recommendation/${newId}` as never)
      }
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

  function renderRequestsPage() {
    if (requests.length === 0) {
      return (
        <EmptyBlock
          icon="document-text-outline"
          title="No requests yet"
          body="Start a new request — your instructor stays in control of drafts and PDF release."
        />
      )
    }

    if (filteredRequests.length === 0) {
      return (
        <EmptyBlock
          icon="search-outline"
          title="No matching letters"
          body="Try another filter or search term."
        />
      )
    }

    return (
      <View style={signatureListStyles.list}>
        {filteredRequests.map((item) => (
          <GuestLetterRequestCard
            key={item.id}
            item={item}
            onPress={() => router.push(`/recommendation/${item.id}` as never)}
          />
        ))}
      </View>
    )
  }

  function renderNewRequestPage() {
    return (
      <InfoSectionCard title="New letter request" icon="send-outline" theme={theme}>
        <ModuleSection>
          <Text style={[type.sectionHeader, styles.fieldLabel, { color: native.secondaryLabel }]}>Purpose</Text>
          <View style={styles.chipRow}>
            {RECOMMENDATION_PURPOSES.map((opt) => (
              <Pressable
                key={opt.id}
                style={[
                  styles.chip,
                  { borderColor: native.separator, backgroundColor: native.fill },
                  purpose === opt.id && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setPurpose(opt.id)}
              >
                <Text
                  style={[
                    type.caption,
                    styles.chipText,
                    { color: native.secondaryLabel },
                    purpose === opt.id && styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ModuleSection>

        <ModuleSection>
          <NativeSelect
            label="Course"
            placeholder="Select a course"
            value={courseId != null ? String(courseId) : ""}
            options={courseOptions.map((s) => ({
              value: String(s.id),
              label: guestCourseLabel(s),
            }))}
            onChange={(value) => setCourseId(Number(value))}
            variant="grouped"
          />
        </ModuleSection>

        <ModuleSection>
          <NativeSelect
            label="Instructor"
            placeholder="Select an instructor"
            value={instructorId != null ? String(instructorId) : ""}
            options={instructorOptions.map((i) => ({
              value: String(i.id),
              label: guestInstructorLabel(i),
            }))}
            onChange={(value) => setInstructorId(Number(value))}
            variant="grouped"
          />
        </ModuleSection>

        <ModuleSection>
          <Text style={[type.sectionHeader, styles.fieldLabel, { color: native.secondaryLabel }]}>Deadline</Text>
          <TextInput
            style={[styles.input, { borderColor: native.separator, color: native.label, backgroundColor: native.fill }]}
            placeholder="YYYY-MM-DD (optional)"
            placeholderTextColor={native.tertiaryLabel}
            value={deadline}
            onChangeText={setDeadline}
            autoCapitalize="none"
          />
        </ModuleSection>

        <ModuleSection>
          <Text style={[type.sectionHeader, styles.fieldLabel, { color: native.secondaryLabel }]}>
            Notes for your instructor
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: native.separator, color: native.label, backgroundColor: native.fill }]}
            placeholder="Brief context — scholarship name, program, or timeline"
            placeholderTextColor={native.tertiaryLabel}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </ModuleSection>

        <Pressable
          style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && styles.submitBtnDisabled]}
          onPress={() => void submit()}
          disabled={submitting}
        >
          <Ionicons name="paper-plane-outline" size={16} color="#ffffff" />
          <Text style={styles.submitText}>{submitting ? "Submitting…" : "Submit request"}</Text>
        </Pressable>
        {message ? (
          <Text style={[type.caption, styles.success, { color: theme.primaryDark }]}>{message}</Text>
        ) : null}
      </InfoSectionCard>
    )
  }

  if (!guestSession) return null

  return (
    <TabbedModuleLayout
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      error={error}
      chrome={
        tab === "requests" && requests.length > 0 ? (
          <GuestLetterSearchBar
            search={search}
            onSearchChange={setSearch}
            filter={letterFilter}
            onFilterChange={setLetterFilter}
            filterOptions={filterOptions}
            resultsShown={filteredRequests.length}
            resultsTotal={requests.length}
          />
        ) : null
      }
      pages={[renderRequestsPage(), renderNewRequestPage()]}
    />
  )
}

const styles = StyleSheet.create({
  fieldLabel: { marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontWeight: "600" },
  chipTextActive: { color: "#ffffff" },
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
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  success: { marginTop: 8 },
})
