import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams } from "expo-router"
import { ApiError } from "../../lib/api"
import { AppAlert } from "../../lib/app-alert"
import {
  COURSE_EXCHANGE_TABS,
  EXCHANGE_POST_IMPORT_CHECKLIST,
  type CourseExchangeModule,
  type CourseExchangeTabId,
  type CourseExchangeLayout,
  type DestinationCourseRow,
  type DiscoverFilter,
  type DiscoverableCourse,
  type ExchangeCopyRow,
  type ExchangeRequestDetail,
  type ExchangeSessionRow,
  type MyCourseSharing,
  type ReceivedFilter,
  type SentFilter,
  type ShareSettingsFilter,
  type SharedWithMeFilter,
  countActiveSentRequests,
  countPendingReceivedRequests,
  copyRowId,
  copyRowUpdateCount,
  canManageCourseSettings,
  courseExchangeDrawerBadgeCount,
  dedupeOwnedDestinationCourses,
  discoverRowMatchesSearch,
  parseCourseExchangeTabParam,
  parseExchangeProvenance,
  pickPreferredDestinationCourseId,
} from "../../lib/course-exchange-shared"
import { FACULTY_COURSE_EXCHANGE_COLOR } from "../../lib/faculty-course-exchange-theme"
import { instructorApi } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { FacultyEmptyState } from "./faculty-shared"
import {
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  useFacultyStickyHeaderScrollLayout,
} from "./faculty-module-shell"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FacultyCourseExchangeCardGrid,
  FacultyCourseExchangeCopyCard,
  FacultyCourseExchangeCopyGridCard,
  FacultyCourseExchangeDiscoverCard,
  FacultyCourseExchangeDiscoverGridCard,
  FacultyCourseExchangeRequestCard,
  FacultyCourseExchangeRequestGridCard,
} from "./course-exchange/FacultyCourseExchangeListCards"
import { FacultyCourseExchangeDiscoverSheet } from "./course-exchange/FacultyCourseExchangeDiscoverSheet"
import { FacultyCourseExchangeRequestSheet } from "./course-exchange/FacultyCourseExchangeRequestSheet"
import { FacultyCourseExchangeImportSheet } from "./course-exchange/FacultyCourseExchangeImportSheet"
import { FacultyCourseExchangeUpdateSheet } from "./course-exchange/FacultyCourseExchangeUpdateSheet"
import { FacultyCourseExchangeShareSettingsPanel } from "./course-exchange/FacultyCourseExchangeShareSettingsPanel"
import { FacultyCourseExchangeShareSettingsSheet } from "./course-exchange/FacultyCourseExchangeShareSettingsSheet"
import { FacultyCourseExchangeCopySheet } from "./course-exchange/FacultyCourseExchangeCopySheet"

export function FacultyCourseExchangeScreen() {
  const { styles: moduleStyles, native, type } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>()
  const { scope, ready } = useFacultyScope()
  const { selectedCourse, setBadges } = useFacultyShell()

  const [tab, setTab] = useState<CourseExchangeTabId>(() => parseCourseExchangeTabParam(tabParam))
  const [search, setSearch] = useState("")
  const [discoverFilter, setDiscoverFilter] = useState<DiscoverFilter>("all")
  const [exchangeLayout, setExchangeLayout] = useState<CourseExchangeLayout>("grid")
  const [receivedFilter, setReceivedFilter] = useState<ReceivedFilter>("all")
  const [sentFilter, setSentFilter] = useState<SentFilter>("all")
  const [sharedWithMeFilter, setSharedWithMeFilter] = useState<SharedWithMeFilter>("all")
  const [shareSettingsFilter, setShareSettingsFilter] = useState<ShareSettingsFilter>("all")

  const [discoverRows, setDiscoverRows] = useState<DiscoverableCourse[]>([])
  const [received, setReceived] = useState<ExchangeRequestDetail[]>([])
  const [sent, setSent] = useState<ExchangeRequestDetail[]>([])
  const [sharedWithMe, setSharedWithMe] = useState<ExchangeCopyRow[]>([])
  const [myShared, setMyShared] = useState<ExchangeCopyRow[]>([])
  const [sharingCourses, setSharingCourses] = useState<
    import("../../lib/course-exchange-shared").MyCourseSharing[]
  >([])
  const [accessLog, setAccessLog] = useState<
    import("../../lib/course-exchange-shared").AccessLogRow[]
  >([])
  const [destinationCourses, setDestinationCourses] = useState<DestinationCourseRow[]>([])
  const [sessions, setSessions] = useState<ExchangeSessionRow[]>([])
  const [institutionHint, setInstitutionHint] = useState<string | null>(null)
  const [updateCounts, setUpdateCounts] = useState<Record<number, number>>({})
  const [noticeCounts, setNoticeCounts] = useState({ received: 0, sent: 0 })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")

  const [discoverCourse, setDiscoverCourse] = useState<DiscoverableCourse | null>(null)
  const [detailRequest, setDetailRequest] = useState<ExchangeRequestDetail | null>(null)
  const [detailMode, setDetailMode] = useState<"sent" | "received">("sent")
  const [importRequest, setImportRequest] = useState<ExchangeRequestDetail | null>(null)
  const [updateCopyId, setUpdateCopyId] = useState<number | null>(null)
  const [configureCourse, setConfigureCourse] = useState<MyCourseSharing | null>(null)
  const [reviewCopy, setReviewCopy] = useState<ExchangeCopyRow | null>(null)
  const [reviewCopyVariant, setReviewCopyVariant] = useState<"shared-with-me" | "my-shared">("shared-with-me")

  const destinationOptions = useMemo(
    () => dedupeOwnedDestinationCourses(destinationCourses, institutionHint),
    [destinationCourses, institutionHint],
  )

  const tabItems = useMemo(
    () =>
      COURSE_EXCHANGE_TABS.map((item) => ({
        ...item,
        count:
          item.id === "received"
            ? noticeCounts.received || undefined
            : item.id === "sent"
              ? noticeCounts.sent || undefined
              : undefined,
      })),
    [noticeCounts],
  )

  const loadNoticeCounts = useCallback(async () => {
    if (!scope) return
    try {
      const summary = await instructorApi.getCourseExchangeSummary(scope)
      setNoticeCounts({
        received: Number(summary.receivedPending ?? summary.pending ?? 0),
        sent: Number(summary.sentActive ?? summary.sentActionable ?? 0),
      })
      setBadges({ courseExchange: courseExchangeDrawerBadgeCount(summary) })
    } catch {
      /* non-blocking */
    }
  }, [scope, setBadges])

  const loadCoursesAndSessions = useCallback(async () => {
    if (!scope) return
    const [coursesRes, sessionsRes] = await Promise.all([
      instructorApi.getCourses(scope.instructorId),
      instructorApi.getAllInstructorSessions(scope),
    ])
    const offerings = coursesRes.offerings ?? coursesRes.courses ?? []
    setInstitutionHint(offerings.find((c) => c.university?.trim())?.university ?? null)
    setDestinationCourses(
      offerings.map((c) => ({
        course_id: Number(c.course_id ?? c.id),
        course_code: c.course_code,
        course_title: c.course_title,
        exchange_provenance: (c as { exchange_provenance?: { sourceCourseCode?: string } }).exchange_provenance ?? null,
      })),
    )
    setSessions(
      sessionsRes.map((s) => ({
        id: s.id,
        code: s.code,
        course_id: Number((s as { course_id?: number }).course_id ?? 0),
      })),
    )
  }, [scope])

  const loadDiscover = useCallback(async () => {
    if (!scope) return
    setDiscoverRows(await instructorApi.getCourseExchangeDiscover(scope))
  }, [scope])

  const loadRequests = useCallback(async () => {
    if (!scope) return
    const [recv, sentRows] = await Promise.all([
      instructorApi.getCourseExchangeRequests(scope, "received"),
      instructorApi.getCourseExchangeRequests(scope, "sent"),
    ])
    setReceived(recv)
    setSent(sentRows)
    setNoticeCounts({
      received: countPendingReceivedRequests(recv),
      sent: countActiveSentRequests(sentRows),
    })
  }, [scope])

  const loadCopies = useCallback(async () => {
    if (!scope) return
    const [swm, ms] = await Promise.all([
      instructorApi.getCourseExchangeSharedWithMe(scope),
      instructorApi.getCourseExchangeMyShared(scope),
    ])
    setSharedWithMe(swm)
    setMyShared(ms)

    const counts: Record<number, number> = {}
    for (const copy of swm) {
      const id = copyRowId(copy)
      const pending = copyRowUpdateCount(copy)
      if (id != null && pending > 0) counts[id] = pending
    }
    setUpdateCounts(counts)

    try {
      const refreshed = await instructorApi.getCourseExchangeUpdateCounts(scope)
      const next: Record<number, number> = {}
      for (const [id, meta] of Object.entries(refreshed.counts ?? {})) {
        if (meta.hasUpdates) next[Number(id)] = meta.changeCount
      }
      setUpdateCounts(next)
    } catch {
      /* keep DB counts */
    }
  }, [scope])

  const loadSharing = useCallback(async () => {
    if (!scope) return
    const [courses, log] = await Promise.all([
      instructorApi.getCourseExchangeSharingSettings(scope),
      instructorApi.getCourseExchangeAccessLog(scope),
    ])
    setSharingCourses(courses)
    setAccessLog(log)
  }, [scope])

  const loadTabData = useCallback(async () => {
    if (!scope) return
    setError("")
    if (tab === "discover") await loadDiscover()
    if (tab === "received" || tab === "sent") await loadRequests()
    if (tab === "shared-with-me" || tab === "my-shared") await loadCopies()
    if (tab === "share-settings") await loadSharing()
  }, [scope, tab, loadDiscover, loadRequests, loadCopies, loadSharing])

  const bootstrap = useCallback(async () => {
    if (!scope) return
    await Promise.all([loadCoursesAndSessions(), loadNoticeCounts(), loadTabData()])
  }, [scope, loadCoursesAndSessions, loadNoticeCounts, loadTabData])

  useEffect(() => {
    setTab(parseCourseExchangeTabParam(tabParam))
  }, [tabParam])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    bootstrap()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load Course Exchange."))
      .finally(() => setLoading(false))
  }, [ready, bootstrap])

  useEffect(() => {
    if (!ready) return
    void loadTabData().catch((err) =>
      setError(err instanceof ApiError ? err.message : "Could not refresh tab."),
    )
  }, [tab, ready, loadTabData])

  useEffect(() => {
    setSearch("")
    setSharedWithMeFilter("all")
    setShareSettingsFilter("all")
  }, [tab])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await bootstrap()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }

  const filteredDiscover = useMemo(
    () =>
      discoverRows.filter((row) => {
        if (discoverFilter === "instant" && !row.autoApprove) return false
        return discoverRowMatchesSearch(row, search)
      }),
    [discoverRows, discoverFilter, search],
  )

  const filteredReceived = useMemo(() => {
    const q = search.trim().toLowerCase()
    return received.filter((r) => {
      if (receivedFilter === "pending" && !(r.needsReview ?? r.status.toUpperCase() === "PENDING")) return false
      if (!q) return true
      return [r.courseCode, r.courseTitle, r.requesterName, r.purpose].filter(Boolean).join(" ").toLowerCase().includes(q)
    })
  }, [received, receivedFilter, search])

  const filteredSent = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sent.filter((r) => {
      const status = r.status.toUpperCase()
      if (sentFilter === "active" && !["PENDING", "APPROVED", "FAILED"].includes(status)) return false
      if (sentFilter === "done" && !["COPIED", "COMPLETED", "REJECTED"].includes(status)) return false
      if (!q) return true
      return [r.courseCode, r.courseTitle, r.creatorName, r.purpose].filter(Boolean).join(" ").toLowerCase().includes(q)
    })
  }, [sent, sentFilter, search])

  const filteredSharedWithMe = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sharedWithMe.filter((c) => {
      if (sharedWithMeFilter === "updates") {
        const id = copyRowId(c)
        const updates = id != null ? updateCounts[id] ?? copyRowUpdateCount(c) : 0
        if (updates <= 0) return false
      }
      if (!q) return true
      return [c.destination_course_code, c.source_course_code, c.source_instructor_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [sharedWithMe, search, sharedWithMeFilter, updateCounts])

  const filteredSharingCourses = useMemo(() => {
    let rows = sharingCourses
    if (shareSettingsFilter === "sharing") {
      rows = rows.filter((c) => c.sharingMode === "request_only")
    } else if (shareSettingsFilter === "off") {
      rows = rows.filter((c) => c.sharingMode !== "request_only")
    }
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((c) =>
      [c.courseCode, c.courseTitle].join(" ").toLowerCase().includes(q),
    )
  }, [sharingCourses, shareSettingsFilter, search])

  const filteredMyShared = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return myShared
    return myShared.filter((c) =>
      [c.source_course_code, c.destination_course_code, c.requester_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [myShared, search])

  const detailDestinationLabel = useMemo(() => {
    if (!detailRequest?.destination_course_id) return null
    const match = destinationOptions.find((c) => c.course_id === detailRequest.destination_course_id)
    return match ? `${match.course_code} — ${match.course_title}` : `Course #${detailRequest.destination_course_id}`
  }, [detailRequest, destinationOptions])

  const preferredDestinationForDiscover = useMemo(() => {
    if (!discoverCourse) return null
    return pickPreferredDestinationCourseId(destinationOptions, discoverCourse.courseCode, institutionHint)
  }, [discoverCourse, destinationOptions, institutionHint])

  function openDiscoverCourse(row: DiscoverableCourse) {
    setDiscoverCourse(row)
  }

  async function reviewDiscoverRequest() {
    const row = discoverCourse
    const rel = row?.relationship
    if (!row || !rel?.requestId || rel.kind === "none") return
    let sentRows = sent
    let receivedRows = received
    let match = sentRows.find((s) => s.id === rel.requestId) ?? receivedRows.find((s) => s.id === rel.requestId)
    if (!match && scope) {
      ;[sentRows, receivedRows] = await Promise.all([
        instructorApi.getCourseExchangeRequests(scope, "sent"),
        instructorApi.getCourseExchangeRequests(scope, "received"),
      ])
      setSent(sentRows)
      setReceived(receivedRows)
      match = sentRows.find((s) => s.id === rel.requestId) ?? receivedRows.find((s) => s.id === rel.requestId)
    }
    if (!match) return
    setDetailMode(sentRows.some((s) => s.id === match.id) ? "sent" : "received")
    setDetailRequest({
      ...match,
      shareableModules: row.shareableModules ?? match.shareableModules,
      missingModules: rel.missingModules.length ? rel.missingModules : match.missingModules,
    })
    setDiscoverCourse(null)
  }

  function configureDiscoverCourse() {
    if (!discoverCourse) return
    const match = sharingCourses.find((c) => c.courseId === discoverCourse.courseId)
    setConfigureCourse(
      match ?? {
        courseId: discoverCourse.courseId,
        courseCode: discoverCourse.courseCode,
        courseTitle: discoverCourse.courseTitle,
        sharingMode: "request_only",
        discoverableTitle: discoverCourse.discoverableTitle,
        shareableModules: discoverCourse.shareableModules,
        autoApprove: discoverCourse.autoApprove,
      },
    )
    setDiscoverCourse(null)
  }

  async function submitDiscoverRequest(payload: {
    modules: CourseExchangeModule[]
    purpose: string
    destinationCourseId: number
  }) {
    if (!scope || !discoverCourse) return
    setActing(true)
    try {
      const data = await instructorApi.createCourseExchangeRequest(scope, {
        sourceCourseId: discoverCourse.courseId,
        purpose: payload.purpose,
        requestedModules: payload.modules,
        destinationCourseId: payload.destinationCourseId,
      })
      const imported = Boolean(data.request?.imported || data.request?.autoApproved)
      AppAlert.alert(
        imported ? "Materials imported" : "Request sent",
        imported
          ? "Approved modules were copied into your course. Edits won’t affect the original."
          : "The course creator will review your module request.",
      )
      setDiscoverCourse(null)
      setTab(imported ? "shared-with-me" : "sent")
      await Promise.all([loadRequests(), loadCopies(), loadDiscover()])
    } catch (err) {
      AppAlert.alert("Request failed", err instanceof ApiError ? err.message : "Could not send request.")
    } finally {
      setActing(false)
    }
  }

  async function approveRequest(modules: CourseExchangeModule[]) {
    if (!scope || !detailRequest) return
    setActing(true)
    try {
      const data = await instructorApi.approveCourseExchangeRequest(scope, detailRequest.id, modules)
      AppAlert.alert(
        data.imported ? "Approved and imported" : "Approved",
        data.imported
          ? "Materials were copied into the requester's destination course."
          : "The requester can import from Requests Sent.",
      )
      setDetailRequest(null)
      await loadRequests()
    } catch (err) {
      AppAlert.alert("Approval failed", err instanceof ApiError ? err.message : "Could not approve.")
    } finally {
      setActing(false)
    }
  }

  async function rejectRequest(reason?: string) {
    if (!scope || !detailRequest) return
    setActing(true)
    try {
      await instructorApi.rejectCourseExchangeRequest(scope, detailRequest.id, reason)
      AppAlert.alert("Request rejected")
      setDetailRequest(null)
      await loadRequests()
    } catch (err) {
      AppAlert.alert("Reject failed", err instanceof ApiError ? err.message : "Could not reject.")
    } finally {
      setActing(false)
    }
  }

  async function runImport(payload: { destinationCourseId: number; destinationSessionId?: number | null }) {
    if (!scope || !importRequest) return
    setActing(true)
    try {
      const data = await instructorApi.executeCourseExchangeCopy(scope, importRequest.id, payload)
      const provenance = parseExchangeProvenance(data.attribution)
      AppAlert.alert(
        "Course copied successfully",
        provenance
          ? `Imported from ${provenance.sourceCourseCode}. Review: ${(data.postCopyChecklist ?? EXCHANGE_POST_IMPORT_CHECKLIST).slice(0, 3).join(", ")}…`
          : "Review syllabus dates and publish status before launch.",
      )
      setImportRequest(null)
      setDetailRequest(null)
      await Promise.all([loadRequests(), loadCopies()])
      setTab("shared-with-me")
    } catch (err) {
      AppAlert.alert("Import failed", err instanceof ApiError ? err.message : "Could not import.")
    } finally {
      setActing(false)
    }
  }

  async function supplementRequest(modules: CourseExchangeModule[]) {
    if (!scope || !detailRequest) return
    setActing(true)
    try {
      const data = await instructorApi.supplementCourseExchangeRequest(scope, detailRequest.id, modules)
      AppAlert.alert(
        data.needsApproval ? "Approval requested" : "Modules imported",
        data.needsApproval
          ? "The course owner will review your additional module request."
          : "Selected modules were copied into your destination course.",
      )
      const sentRows = await instructorApi.getCourseExchangeRequests(scope, "sent")
      setSent(sentRows)
      const refreshed = sentRows.find((r) => r.id === detailRequest.id)
      if (refreshed) setDetailRequest(refreshed)
      await Promise.all([loadDiscover(), loadCopies()])
    } catch (err) {
      AppAlert.alert("Could not add modules", err instanceof ApiError ? err.message : "Supplement failed.")
    } finally {
      setActing(false)
    }
  }

  async function saveSharing(payload: {
    courseId: number
    sharingMode: import("../../lib/course-exchange-shared").CourseExchangeSharingMode
    shareableModules: CourseExchangeModule[]
    autoApprove: boolean
    discoverableTitle?: string | null
  }) {
    if (!scope) return
    setActing(true)
    try {
      await instructorApi.saveCourseExchangeSharingSettings(scope, payload)
      AppAlert.alert(
        payload.sharingMode === "request_only" ? "Course is discoverable" : "Sharing turned off",
        payload.sharingMode === "request_only"
          ? payload.autoApprove
            ? "Requests for enabled modules import automatically."
            : "Other instructors can request the modules you enabled."
          : "This course no longer appears in Discover.",
      )
      await loadSharing()
      setConfigureCourse((prev) =>
        prev && prev.courseId === payload.courseId
          ? {
              ...prev,
              sharingMode: payload.sharingMode,
              shareableModules: payload.shareableModules,
              autoApprove: payload.autoApprove,
            }
          : prev,
      )
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Could not save settings.")
    } finally {
      setActing(false)
    }
  }

  const searchPlaceholder = useMemo(() => {
    switch (tab) {
      case "discover":
        return "Search discoverable courses…"
      case "received":
        return "Search received requests…"
      case "sent":
        return "Search sent requests…"
      case "shared-with-me":
        return "Search your imported copies…"
      case "my-shared":
        return "Search outbound shares…"
      case "share-settings":
        return "Search your courses…"
      default:
        return "Search"
    }
  }, [tab])

  function renderViewToggle() {
    return (
      <View style={localStyles.viewToggle}>
        {(["list", "grid"] as const).map((layout) => {
          const active = exchangeLayout === layout
          return (
            <Pressable
              key={layout}
              onPress={() => setExchangeLayout(layout)}
              style={[
                localStyles.viewToggleBtn,
                {
                  borderColor: active ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.separator,
                  backgroundColor: active ? `${FACULTY_COURSE_EXCHANGE_COLOR.action}12` : native.fill,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={layout === "list" ? "List view" : "Grid view"}
            >
              <Ionicons
                name={layout === "list" ? "list-outline" : "grid-outline"}
                size={16}
                color={active ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.secondaryLabel}
              />
            </Pressable>
          )
        })}
      </View>
    )
  }

  function renderFilterChip(id: string, label: string, active: boolean, onPress: () => void) {
    return (
      <Pressable
        key={id}
        onPress={onPress}
        style={[moduleStyles.filterChip, active && moduleStyles.filterChipActive]}
      >
        <Text style={[moduleStyles.filterChipText, active && moduleStyles.filterChipTextActive]}>{label}</Text>
      </Pressable>
    )
  }

  function renderFilterChips() {
    if (tab === "discover") {
      return (
        <View style={localStyles.filterRow}>
          {(["all", "instant"] as DiscoverFilter[]).map((f) =>
            renderFilterChip(f, f === "all" ? "All" : "Instant import", discoverFilter === f, () => setDiscoverFilter(f)),
          )}
          {renderViewToggle()}
        </View>
      )
    }
    if (tab === "received") {
      return (
        <View style={localStyles.filterRow}>
          {(["all", "pending"] as ReceivedFilter[]).map((f) =>
            renderFilterChip(f, f === "all" ? "All" : "Needs review", receivedFilter === f, () => setReceivedFilter(f)),
          )}
          {renderViewToggle()}
        </View>
      )
    }
    if (tab === "sent") {
      return (
        <View style={localStyles.filterRow}>
          {(["all", "active", "done"] as SentFilter[]).map((f) =>
            renderFilterChip(
              f,
              f === "all" ? "All" : f === "active" ? "Active" : "Done",
              sentFilter === f,
              () => setSentFilter(f),
            ),
          )}
          {renderViewToggle()}
        </View>
      )
    }
    if (tab === "shared-with-me") {
      return (
        <View style={localStyles.filterRow}>
          {(["all", "updates"] as SharedWithMeFilter[]).map((f) =>
            renderFilterChip(f, f === "all" ? "All" : "Has updates", sharedWithMeFilter === f, () => setSharedWithMeFilter(f)),
          )}
          {renderViewToggle()}
        </View>
      )
    }
    if (tab === "my-shared") {
      return <View style={localStyles.filterRow}>{renderViewToggle()}</View>
    }
    if (tab === "share-settings") {
      return (
        <View style={localStyles.filterRow}>
          {(["all", "sharing", "off"] as ShareSettingsFilter[]).map((f) =>
            renderFilterChip(
              f,
              f === "all" ? "All" : f === "sharing" ? "Sharing" : "Off",
              shareSettingsFilter === f,
              () => setShareSettingsFilter(f),
            ),
          )}
          {renderViewToggle()}
        </View>
      )
    }
    return null
  }

  function renderListBody() {
    if (loading && tab !== "share-settings") {
      return <ActivityIndicator color={FACULTY_COURSE_EXCHANGE_COLOR.link} style={localStyles.loader} />
    }

    if (tab === "discover") {
      if (filteredDiscover.length === 0) {
        return (
          <FacultyEmptyState
            icon="search-outline"
            title="No courses found"
            body="Try a different search or check back when more instructors share materials."
          />
        )
      }
      if (exchangeLayout === "grid") {
        return (
          <FacultyCourseExchangeCardGrid>
            {filteredDiscover.map((row) => (
              <FacultyCourseExchangeDiscoverGridCard
                key={row.courseId}
                row={row}
                onPress={() => openDiscoverCourse(row)}
              />
            ))}
          </FacultyCourseExchangeCardGrid>
        )
      }
      return filteredDiscover.map((row) => (
        <FacultyCourseExchangeDiscoverCard key={row.courseId} row={row} onPress={() => openDiscoverCourse(row)} />
      ))
    }

    if (tab === "received") {
      if (filteredReceived.length === 0) {
        return (
          <FacultyEmptyState
            icon="mail-open-outline"
            title="No requests yet"
            body="When other instructors request your shared modules, they'll appear here."
          />
        )
      }
      return (
        <>
          {exchangeLayout === "grid" ? (
            <FacultyCourseExchangeCardGrid>
              {filteredReceived.map((row) => (
                <FacultyCourseExchangeRequestGridCard
                  key={row.id}
                  row={row}
                  mode="received"
                  onPress={() => {
                    setDetailMode("received")
                    setDetailRequest(row)
                  }}
                />
              ))}
            </FacultyCourseExchangeCardGrid>
          ) : (
            filteredReceived.map((row) => (
              <FacultyCourseExchangeRequestCard
                key={row.id}
                row={row}
                mode="received"
                onPress={() => {
                  setDetailMode("received")
                  setDetailRequest(row)
                }}
              />
            ))
          )}
        </>
      )
    }

    if (tab === "sent") {
      if (filteredSent.length === 0) {
        return (
          <FacultyEmptyState
            icon="send-outline"
            title="No outbound requests"
            body="Discover a course and request modules to start an exchange."
          />
        )
      }
      return (
        <>
          {exchangeLayout === "grid" ? (
            <FacultyCourseExchangeCardGrid>
              {filteredSent.map((row) => (
                <FacultyCourseExchangeRequestGridCard
                  key={row.id}
                  row={row}
                  mode="sent"
                  onPress={() => {
                    setDetailMode("sent")
                    setDetailRequest(row)
                  }}
                />
              ))}
            </FacultyCourseExchangeCardGrid>
          ) : (
            filteredSent.map((row) => (
              <FacultyCourseExchangeRequestCard
                key={row.id}
                row={row}
                mode="sent"
                onPress={() => {
                  setDetailMode("sent")
                  setDetailRequest(row)
                }}
              />
            ))
          )}
        </>
      )
    }

    if (tab === "shared-with-me") {
      if (filteredSharedWithMe.length === 0) {
        return (
          <FacultyEmptyState
            icon="book-outline"
            title={sharedWithMeFilter === "updates" ? "No pending updates" : "No imported copies"}
            body={
              sharedWithMeFilter === "updates"
                ? "Source courses with new changes will appear here."
                : "Approved requests you import will show up here with optional source updates."
            }
          />
        )
      }
      return (
        <>
          {exchangeLayout === "grid" ? (
            <FacultyCourseExchangeCardGrid>
              {filteredSharedWithMe.map((copy, index) => {
                const id = copyRowId(copy)
                const updates = id != null ? updateCounts[id] ?? copyRowUpdateCount(copy) : 0
                return (
                  <FacultyCourseExchangeCopyGridCard
                    key={String(copy.id ?? index)}
                    copy={copy}
                    variant="shared-with-me"
                    updateCount={updates}
                    onPress={() => {
                      setReviewCopyVariant("shared-with-me")
                      setReviewCopy(copy)
                    }}
                  />
                )
              })}
            </FacultyCourseExchangeCardGrid>
          ) : (
            filteredSharedWithMe.map((copy, index) => {
              const id = copyRowId(copy)
              const updates = id != null ? updateCounts[id] ?? copyRowUpdateCount(copy) : 0
              return (
                <FacultyCourseExchangeCopyCard
                  key={String(copy.id ?? index)}
                  copy={copy}
                  variant="shared-with-me"
                  updateCount={updates}
                  onPress={() => {
                    setReviewCopyVariant("shared-with-me")
                    setReviewCopy(copy)
                  }}
                  onUpdatePress={() => id != null && setUpdateCopyId(id)}
                />
              )
            })
          )}
        </>
      )
    }

    if (tab === "my-shared") {
      if (filteredMyShared.length === 0) {
        return (
          <FacultyEmptyState
            icon="share-social-outline"
            title="No outbound copies yet"
            body="When requesters import your shared modules, copies appear here for your records."
          />
        )
      }
      return (
        <>
          {exchangeLayout === "grid" ? (
            <FacultyCourseExchangeCardGrid>
              {filteredMyShared.map((copy, index) => (
                <FacultyCourseExchangeCopyGridCard
                  key={String(copy.id ?? index)}
                  copy={copy}
                  variant="my-shared"
                  onPress={() => {
                    setReviewCopyVariant("my-shared")
                    setReviewCopy(copy)
                  }}
                />
              ))}
            </FacultyCourseExchangeCardGrid>
          ) : (
            filteredMyShared.map((copy, index) => (
              <FacultyCourseExchangeCopyCard
                key={String(copy.id ?? index)}
                copy={copy}
                variant="my-shared"
                onPress={() => {
                  setReviewCopyVariant("my-shared")
                  setReviewCopy(copy)
                }}
              />
            ))
          )}
        </>
      )
    }

    return (
      <FacultyCourseExchangeShareSettingsPanel
        courses={filteredSharingCourses}
        totalCourses={sharingCourses.length}
        accessLog={accessLog}
        loading={loading}
        layout={exchangeLayout}
        onConfigure={setConfigureCourse}
      />
    )
  }

  if (ready && selectedCourse && !canManageCourseSettings(selectedCourse.staff_role)) {
    return (
      <View style={[moduleStyles.root, localStyles.root]}>
        <FacultyEmptyState
          icon="lock-closed-outline"
          title="Course Exchange unavailable"
          body="Course Exchange requires course settings access. Teaching assistants cannot open this module."
        />
      </View>
    )
  }

  return (
    <View style={[moduleStyles.root, localStyles.root]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabItems} tab={tab} onChange={setTab} scrollable />
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          showFilter={false}
          placement="dock"
        />
      </FacultyModuleStickyHeader>

      {renderFilterChips()}

      {error ? (
        <View style={[moduleStyles.errorBox, localStyles.errorWrap]}>
          <Ionicons name="alert-circle-outline" size={18} color={moduleStyles.errorText.color} />
          <Text style={moduleStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      {tab === "share-settings" ? (
        renderListBody()
      ) : (
        <ScrollView
          contentContainerStyle={[moduleStyles.content, listScrollPad]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={FACULTY_COURSE_EXCHANGE_COLOR.link}
            />
          }
        >
          {renderListBody()}
        </ScrollView>
      )}

      <FacultyCourseExchangeDiscoverSheet
        visible={discoverCourse != null}
        course={discoverCourse}
        destinationCourses={destinationOptions}
        preferredDestinationCourseId={preferredDestinationForDiscover}
        loading={acting}
        onClose={() => setDiscoverCourse(null)}
        onConfigure={configureDiscoverCourse}
        onReviewRequest={() => void reviewDiscoverRequest()}
        onSubmit={submitDiscoverRequest}
      />

      <FacultyCourseExchangeShareSettingsSheet
        visible={configureCourse != null}
        course={configureCourse}
        saving={acting}
        onClose={() => setConfigureCourse(null)}
        onSave={saveSharing}
      />

      <FacultyCourseExchangeCopySheet
        visible={reviewCopy != null}
        copy={reviewCopy}
        variant={reviewCopyVariant}
        updateCount={
          reviewCopy != null
            ? updateCounts[copyRowId(reviewCopy) ?? -1] ?? copyRowUpdateCount(reviewCopy)
            : 0
        }
        onClose={() => setReviewCopy(null)}
        onUpdate={() => {
          const id = reviewCopy ? copyRowId(reviewCopy) : null
          if (id == null) return
          setReviewCopy(null)
          setUpdateCopyId(id)
        }}
      />

      <FacultyCourseExchangeRequestSheet
        visible={detailRequest != null && importRequest == null}
        request={detailRequest}
        mode={detailMode}
        destinationLabel={detailDestinationLabel}
        loading={acting}
        onClose={() => setDetailRequest(null)}
        onImport={() => detailRequest && setImportRequest(detailRequest)}
        onApprove={approveRequest}
        onReject={rejectRequest}
        onSupplement={supplementRequest}
      />

      <FacultyCourseExchangeImportSheet
        visible={importRequest != null}
        request={importRequest}
        destinationCourses={destinationOptions}
        sessions={sessions}
        loading={acting}
        onClose={() => setImportRequest(null)}
        onImport={runImport}
      />

      <FacultyCourseExchangeUpdateSheet
        visible={updateCopyId != null}
        copyId={updateCopyId}
        onClose={() => setUpdateCopyId(null)}
        onApplied={() => void loadCopies()}
      />
    </View>
  )
}

const localStyles = StyleSheet.create({
  root: { flex: 1 },
  loader: { marginTop: 32 },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  errorWrap: { marginHorizontal: 16, marginBottom: 8 },
  viewToggle: { flexDirection: "row", gap: 6, marginLeft: "auto" },
  viewToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
})
