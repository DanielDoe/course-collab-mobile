import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type InstructorAccountRequest,
  type InstructorPasswordResetRequest,
  type InstructorSession,
  type InstructorStudent} from "../../lib/instructor-api"
import {
  accountRequestKindLabel,
  directoryRequestIsPending,
  filterAccountRequests,
  filterPasswordResets,
  filterStudents,
  type StudentDirectoryTab} from "../../lib/faculty-students-utils"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyManualAwardModal } from "./FacultyManualAwardModal"
import { FacultyAddStudentModal } from "./FacultyAddStudentModal"
import { FacultyStudentDetailModal } from "./FacultyStudentDetailModal"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_STUDENTS_COLOR } from "../../lib/faculty-students-theme"
import {
  FacultyStudentDirectoryCard,
  FacultyStudentRequestCard,
} from "./FacultyStudentsListCards"
import {
  FacultyAccountRequestActionSheet,
  FacultyPasswordResetActionSheet,
} from "./FacultyStudentsActionSheets"
import { useFacultyStickyHeaderScrollLayout,
  FacultyFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  sectionFilterSheetOptions,
  resolveSessionFilterCode,
  sessionFilterDisplayLabel} from "./faculty-module-shell"
import { ModuleFlashList } from "../ModuleFlashList"

const TABS: Array<{ id: StudentDirectoryTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "students", label: "Students", icon: "people-outline" },
  { id: "resets", label: "Resets", icon: "key-outline" },
  { id: "requests", label: "Requests", icon: "mail-outline" },
]

export function FacultyStudentsScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready, course } = useFacultyScope()

  const [tab, setTab] = useState<StudentDirectoryTab>("students")
  const [selectedStudent, setSelectedStudent] = useState<InstructorStudent | null>(null)
  const [selectedReset, setSelectedReset] = useState<InstructorPasswordResetRequest | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<InstructorAccountRequest | null>(null)
  const [awardStudent, setAwardStudent] = useState<InstructorStudent | null>(null)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [sessionFilter, setSessionFilter] = useState("ALL")
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [resets, setResets] = useState<InstructorPasswordResetRequest[]>([])
  const [requests, setRequests] = useState<InstructorAccountRequest[]>([])
  const [actingId, setActingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const sessionCode = resolveSessionFilterCode(sessions, sessionFilter)
    const [studentRows, resetRows, requestRows, sessionRes] = await Promise.all([
      instructorApi.getStudents(scope, sessionCode),
      instructorApi.getPasswordResets(scope),
      instructorApi.getAccountRequests(scope),
      instructorApi.getSessions(scope),
    ])
    setStudents(studentRows)
    setResets(resetRows)
    setRequests(requestRows)
    setSessions(sessionRes.sessions ?? [])
  }, [scope, sessionFilter])

  useNotificationModuleRefresh("students", load)

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load directory."))
      .finally(() => setLoading(false))
  }, [ready, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }

  const pendingResets = useMemo(
    () => resets.filter((r) => directoryRequestIsPending(r.status)).length,
    [resets],
  )
  const pendingRequests = useMemo(
    () => requests.filter((r) => directoryRequestIsPending(r.status)).length,
    [requests],
  )

  const filteredStudents = useMemo(() => filterStudents(students, search), [students, search])
  const filteredResets = useMemo(() => filterPasswordResets(resets, search), [resets, search])
  const filteredRequests = useMemo(
    () => filterAccountRequests(requests, search),
    [requests, search],
  )

  async function approveReset(row: InstructorPasswordResetRequest) {
    if (!scope) return
    setActingId(row.id)
    try {
      const res = await instructorApi.approvePasswordReset(scope, row.id)
      AppAlert.alert("Approved", res.message ?? "Password reset approved.")
      setSelectedReset(null)
      await load()
    } catch (err) {
      AppAlert.alert("Could not approve", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActingId(null)
    }
  }

  async function rejectReset(row: InstructorPasswordResetRequest, reason?: string) {
    if (!scope) return
    setActingId(row.id)
    try {
      await instructorApi.rejectPasswordReset(scope, row.id, reason)
      setSelectedReset(null)
      await load()
    } catch (err) {
      AppAlert.alert("Could not reject", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActingId(null)
    }
  }

  async function approveRequest(row: InstructorAccountRequest) {
    if (!scope) return
    setActingId(row.id)
    try {
      const res = await instructorApi.approveAccountRequest(scope, row.id)
      AppAlert.alert("Approved", res.message ?? "Account request approved.")
      setSelectedRequest(null)
      await load()
    } catch (err) {
      AppAlert.alert("Could not approve", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActingId(null)
    }
  }

  async function rejectRequest(row: InstructorAccountRequest, reason?: string) {
    if (!scope) return
    setActingId(row.id)
    try {
      await instructorApi.rejectAccountRequest(scope, row.id, reason)
      setSelectedRequest(null)
      await load()
    } catch (err) {
      AppAlert.alert("Could not reject", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActingId(null)
    }
  }

  type StudentListRow =
    | { key: string; kind: "student"; student: InstructorStudent }
    | { key: string; kind: "reset"; row: InstructorPasswordResetRequest }
    | { key: string; kind: "request"; row: InstructorAccountRequest }

  const listRows = useMemo((): StudentListRow[] => {
    if (loading) return []
    if (tab === "students") {
      return filteredStudents.map((student) => ({ key: String(student.id), kind: "student", student }))
    }
    if (tab === "resets") {
      return filteredResets.map((row) => ({ key: String(row.id), kind: "reset", row }))
    }
    return filteredRequests.map((row) => ({ key: String(row.id), kind: "request", row }))
  }, [loading, tab, filteredStudents, filteredResets, filteredRequests])

  const listEmptyMeta = useMemo(() => {
    if (loading) return null
    if (tab === "students") {
      return {
        icon: "people-outline" as const,
        title: students.length === 0 ? "No students yet" : "No matches",
        body:
          students.length === 0
            ? "Enrolled students for this course will appear here."
            : "Try another section or search term.",
      }
    }
    if (tab === "resets") {
      return {
        icon: "key-outline" as const,
        title: "No password resets",
        body: "Student password reset requests will appear here.",
      }
    }
    return {
      icon: "mail-outline" as const,
      title: "No account requests",
      body: "Guest and roster join requests will appear here.",
    }
  }, [loading, tab, students.length])

  const renderStudentRow = useCallback(({ item }: { item: StudentListRow }) => {
    if (item.kind === "student") {
      return (
        <FacultyStudentDirectoryCard
          student={item.student}
          onPress={() => setSelectedStudent(item.student)}
        />
      )
    }
    if (item.kind === "reset") {
      const row = item.row
      return (
        <FacultyStudentRequestCard
          name={row.full_name}
          subtitle={row.student_number ?? row.email ?? ""}
          meta={`${row.section ?? "Course"} · ${formatFacultyRelativeTime(row.requested_at)}`}
          status={row.status}
          thumbKind="reset"
          seed={row.id}
          onPress={() => setSelectedReset(row)}
        />
      )
    }
    const row = item.row
    return (
      <FacultyStudentRequestCard
        name={row.full_name}
        subtitle={row.email ?? row.student_id}
        meta={`${accountRequestKindLabel(row.request_kind)} · ${formatFacultyRelativeTime(row.created_at)}`}
        badge={row.guest_purpose?.replace(/_/g, " ") ?? row.section}
        status={row.status}
        thumbKind="request"
        seed={row.id}
        onPress={() => setSelectedRequest(row)}
      />
    )
  }, [])

  const listHeader = useMemo(
    () =>
      error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null,
    [error],
  )

  if (!ready) {
    return (
      <View style={[moduleStyles.center, styles.center]}>
        <FacultyEmptyState
          icon="book-outline"
          title="Select a course"
          body="The student directory is scoped to your active course."
        />
      </View>
    )
  }

  const tabItems = TABS.map((t) => ({
    ...t,
    label:
      t.id === "resets" && pendingResets > 0
        ? `Resets · ${pendingResets}`
        : t.id === "requests" && pendingRequests > 0
          ? `Requests · ${pendingRequests}`
          : t.label}))

  return (
    <View style={[moduleStyles.root, styles.root]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabItems} tab={tab} onChange={setTab} scrollable />

        {tab === "students" ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search name, ID, email, section…"
            filterActive={sessionFilter !== "ALL"}
            onOpenFilter={() => setSessionSheetOpen(true)}
            trailingAction={{
              onPress: () => setAddStudentOpen(true),
              accessibilityLabel: "Add student"}}
          />
        ) : (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={tab === "resets" ? "Search password reset requests…" : "Search account requests…"}
            showFilter={false}
          />
        )}
      </FacultyModuleStickyHeader>

      <ModuleFlashList
        data={listRows}
        keyExtractor={(item) => item.key}
        renderItem={renderStudentRow}
        extraData={tab}
        contentContainerStyle={[styles.content, listScrollPad]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={FACULTY_STUDENTS_COLOR.link} />
            </View>
          ) : listEmptyMeta ? (
            <FacultyEmptyState icon={listEmptyMeta.icon} title={listEmptyMeta.title} body={listEmptyMeta.body} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_STUDENTS_COLOR.link}
          />
        }
      />

      <FacultyFilterSheet
        visible={sessionSheetOpen}
        title="Filter by section"
        subtitle="Show students from one session or all sections."
        options={sectionFilterSheetOptions(sessions)}
        value={sessionFilter}
        onSelect={setSessionFilter}
        onClose={() => setSessionSheetOpen(false)}
      />

      <FacultyStudentDetailModal
        student={selectedStudent}
        scope={scope}
        onClose={() => setSelectedStudent(null)}
        onAwardPoints={(student) => {
          setSelectedStudent(null)
          setAwardStudent(student)
        }}
      />

      <FacultyAddStudentModal
        visible={addStudentOpen}
        scope={scope}
        courseCode={course?.course_code}
        courseTitle={course?.course_title}
        sessions={sessions}
        defaultSessionCode={resolveSessionFilterCode(sessions, sessionFilter) ?? undefined}
        onClose={() => setAddStudentOpen(false)}
        onAdded={() => void load()}
      />

      <FacultyManualAwardModal
        visible={awardStudent != null}
        scope={scope}
        defaultSession={resolveSessionFilterCode(sessions, sessionFilter) ?? awardStudent?.section ?? awardStudent?.session_code}
        initialStudentId={awardStudent?.id ?? null}
        onClose={() => setAwardStudent(null)}
        onAwarded={() => {
          setAwardStudent(null)
          void load()
        }}
      />

      <FacultyPasswordResetActionSheet
        visible={selectedReset != null}
        row={selectedReset}
        acting={selectedReset != null && actingId === selectedReset.id}
        onClose={() => setSelectedReset(null)}
        onApprove={() => selectedReset && void approveReset(selectedReset)}
        onReject={(reason) => selectedReset && void rejectReset(selectedReset, reason)}
      />

      <FacultyAccountRequestActionSheet
        visible={selectedRequest != null}
        row={selectedRequest}
        acting={selectedRequest != null && actingId === selectedRequest.id}
        onClose={() => setSelectedRequest(null)}
        onApprove={() => selectedRequest && void approveRequest(selectedRequest)}
        onReject={(reason) => selectedRequest && void rejectRequest(selectedRequest, reason)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1},
  scroll: { flex: 1 },
  content: { padding: NATIVE.pagePadding, gap: 12 },
  center: { flex: 1, justifyContent: "center", padding: 24},
  errorBox: {
    backgroundColor: SYSTEM.red.soft,
    borderRadius: NATIVE.sectionRadius,
    padding: 12},
  errorText: { color: SYSTEM.red.color, fontSize: 14, lineHeight: 20 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
})
