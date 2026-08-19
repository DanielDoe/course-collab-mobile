import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  accessRequestScopeLabel,
  accessRequestTypeLabel,
  countPendingAccessRequests,
  filterAccessRequestsBySection,
  filterAccessRequestsSearch,
  type AccessRequestSection,
} from "../../lib/faculty-access-requests-utils"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type InstructorAccountRequest,
} from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyStudentRequestCard } from "./FacultyStudentsListCards"
import { FacultyAccountRequestActionSheet } from "./FacultyStudentsActionSheets"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_STUDENTS_COLOR } from "../../lib/faculty-students-theme"
import {
  useFacultyStickyHeaderScrollLayout,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
} from "./faculty-module-shell"
import { ModuleFlashList } from "../ModuleFlashList"
import { AppAlert } from "../../lib/app-alert"

const SECTIONS: Array<{ id: AccessRequestSection; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "students", label: "Students", icon: "school-outline" },
  { id: "career_members", label: "Career Members", icon: "briefcase-outline" },
  { id: "summer_students", label: "Summer Students", icon: "sunny-outline" },
]

export function FacultyAccessRequestsScreen() {
  const { styles: moduleStyles } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad, chromeTop } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [section, setSection] = useState<AccessRequestSection>("students")
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<InstructorAccountRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<InstructorAccountRequest | null>(null)
  const [actingId, setActingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    setRows(await instructorApi.getAccountRequests(scope))
  }, [scope])

  useNotificationModuleRefresh("students", load)

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load access requests."))
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

  const filtered = useMemo(() => {
    const scoped = filterAccessRequestsBySection(rows, section)
    return filterAccessRequestsSearch(scoped, search)
  }, [rows, section, search])

  const tabItems = useMemo(
    () =>
      SECTIONS.map((tab) => {
        const pending = countPendingAccessRequests(filterAccessRequestsBySection(rows, tab.id))
        return {
          ...tab,
          label: pending > 0 ? `${tab.label} · ${pending}` : tab.label,
        }
      }),
    [rows],
  )

  async function approveRequest(row: InstructorAccountRequest) {
    if (!scope) return
    setActingId(row.id)
    try {
      const res = await instructorApi.approveAccountRequest(scope, row.id)
      AppAlert.alert("Approved", res.message ?? "Access request approved.")
      setSelected(null)
      await load()
    } catch (err) {
      AppAlert.alert("Could not approve", err instanceof ApiError ? err.message : "Approval failed.")
    } finally {
      setActingId(null)
    }
  }

  async function rejectRequest(row: InstructorAccountRequest, reason?: string) {
    if (!scope) return
    setActingId(row.id)
    try {
      await instructorApi.rejectAccountRequest(scope, row.id, reason)
      AppAlert.alert("Rejected", "Access request declined.")
      setSelected(null)
      await load()
    } catch (err) {
      AppAlert.alert("Could not reject", err instanceof ApiError ? err.message : "Rejection failed.")
    } finally {
      setActingId(null)
    }
  }

  const listRows = useMemo(
    () => filtered.map((row) => ({ key: String(row.id), row })),
    [filtered],
  )

  if (!ready) {
    return (
      <View style={[moduleStyles.center, styles.center]}>
        <FacultyEmptyState
          icon="shield-checkmark-outline"
          title="Select a course"
          body="Access requests are scoped to your active course and programs."
        />
      </View>
    )
  }

  return (
    <View style={[moduleStyles.root, styles.root]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabItems} tab={section} onChange={setSection} scrollable />
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search name, email, section, program…"
          showFilter={false}
          placement="dock"
        />
      </FacultyModuleStickyHeader>

      <ModuleFlashList
        data={listRows}
        keyExtractor={(item) => item.key}
        extraData={section}
        contentContainerStyle={[styles.content, listScrollPad, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={FACULTY_STUDENTS_COLOR.link} />
            </View>
          ) : (
            <FacultyEmptyState
              icon="mail-open-outline"
              title="No requests"
              body={`No ${SECTIONS.find((s) => s.id === section)?.label.toLowerCase() ?? "access"} requests in your authority.`}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_STUDENTS_COLOR.link}
            {...(chromeTop > 0 ? { progressViewOffset: chromeTop } : {})}
          />
        }
        renderItem={({ item }) => {
          const row = item.row
          return (
            <View style={styles.listRowWrap}>
              <FacultyStudentRequestCard
                name={row.full_name}
                subtitle={row.email ?? row.student_id}
                meta={`${accessRequestTypeLabel(row)} · ${accessRequestScopeLabel(row)} · ${formatFacultyRelativeTime(row.created_at)}`}
                badge={row.email_verified_at ? "Email verified" : "Email pending"}
                status={row.status}
                thumbKind="request"
                seed={row.id}
                onPress={() => setSelected(row)}
              />
            </View>
          )
        }}
      />

      <FacultyAccountRequestActionSheet
        visible={Boolean(selected)}
        row={selected}
        acting={actingId === selected?.id}
        onClose={() => setSelected(null)}
        onApprove={() => {
          if (selected) void approveRequest(selected)
        }}
        onReject={(reason) => {
          if (selected) void rejectRequest(selected, reason)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1 },
  content: { paddingHorizontal: 16 },
  listRowWrap: { marginBottom: 10 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  errorBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  errorText: { color: "#b91c1c", fontSize: 14 },
})
