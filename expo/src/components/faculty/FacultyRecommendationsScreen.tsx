import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams } from "expo-router"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorRecommendationRequest, type InstructorSession } from "../../lib/instructor-api"
import {
  countRecommendationsByFilter,
  filterRecommendations,
  type RecommendationFilter,
} from "../../lib/faculty-recommendations-utils"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyRecommendationCreateModal } from "./FacultyRecommendationCreateModal"
import { FacultyRecommendationWorkspaceModal } from "./FacultyRecommendationWorkspaceModal"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_RECOMMENDATIONS_COLOR } from "../../lib/faculty-recommendations-theme"
import { FacultyRecommendationLetterCard } from "./FacultyRecommendationsListCards"
import { FacultyGuestAccountRequestsPanel, guestAccountRequestsFilterActive } from "./FacultyGuestAccountRequestsPanel"
import type { GuestAccountSortKey, GuestAccountStatusFilter } from "../../lib/faculty-guest-account-requests-utils"
import { useFacultyStickyHeaderScrollLayout, FacultyModuleStickyHeader, FacultyModuleTabBar, FacultySearchToolbar } from "./faculty-module-shell"

type RecommendationTab = RecommendationFilter | "guest-requests"

const LETTER_FILTERS: Array<{ id: RecommendationFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "all", label: "All", icon: "layers-outline" },
  { id: "pending", label: "Pending", icon: "time-outline" },
  { id: "active", label: "Active", icon: "create-outline" },
  { id: "done", label: "Done", icon: "checkmark-done-outline" },
]

const GUEST_TAB = {
  id: "guest-requests" as const,
  label: "Guest requests",
  icon: "person-add-outline" as keyof typeof Ionicons.glyphMap,
}

function isGuestTab(tab: RecommendationTab): tab is "guest-requests" {
  return tab === "guest-requests"
}

export function FacultyRecommendationsScreen() {
  const { styles: moduleStyles } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { open, tab: tabParam } = useLocalSearchParams<{ open?: string; tab?: string }>()
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<RecommendationTab>(tabParam === "guest-requests" ? "guest-requests" : "all")
  const [requests, setRequests] = useState<InstructorRecommendationRequest[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "letter" | "questionnaire" | "activity">("overview")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [guestPendingCount, setGuestPendingCount] = useState(0)
  const [guestStatusFilter, setGuestStatusFilter] = useState<GuestAccountStatusFilter>("all")
  const [guestSort, setGuestSort] = useState<GuestAccountSortKey>("submitted_desc")
  const [guestFilterOpen, setGuestFilterOpen] = useState(false)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const [rows, sessionRes] = await Promise.all([
      instructorApi.getRecommendations(scope),
      instructorApi.getSessions(scope, scope.academicTermId ?? undefined),
    ])
    setRequests(rows)
    setSessions(sessionRes.sessions ?? [])
  }, [scope])

  useEffect(() => {
    if (tabParam === "guest-requests") setTab("guest-requests")
  }, [tabParam])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load letters."))
      .finally(() => setLoading(false))
  }, [ready, load])

  useEffect(() => {
    const openId = Number(open)
    if (Number.isFinite(openId) && openId > 0) {
      setWorkspaceTab("letter")
      setSelectedId(openId)
    }
  }, [open])

  function openLetterWorkspace(requestId: number) {
    setWorkspaceTab("letter")
    setSelectedId(requestId)
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh("recommendations", handleRefresh)

  const letterCounts = useMemo(() => countRecommendationsByFilter(requests), [requests])
  const letterFilter = isGuestTab(tab) ? "all" : tab
  const filtered = useMemo(
    () => (isGuestTab(tab) ? [] : filterRecommendations(requests, letterFilter, search)),
    [requests, letterFilter, search, tab],
  )

  const tabs = useMemo(
    () => [
      ...LETTER_FILTERS.map((f) => ({
        ...f,
        count: letterCounts[f.id] > 0 && f.id !== "all" ? letterCounts[f.id] : undefined,
      })),
      {
        ...GUEST_TAB,
        count: guestPendingCount > 0 ? guestPendingCount : undefined,
      },
    ],
    [letterCounts, guestPendingCount],
  )

  const searchPlaceholder = isGuestTab(tab)
    ? "Search name, email, organization…"
    : "Filter by student, course, status…"

  function switchTab(next: RecommendationTab) {
    setTab(next)
    setSearch("")
    if (!isGuestTab(next)) setGuestFilterOpen(false)
  }

  function openPendingLetters() {
    switchTab("pending")
  }

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="document-text-outline"
          title="Select a course"
          body="Recommendation letters are scoped to your instructor account."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabs} tab={tab} onChange={switchTab} scrollable />

        {isGuestTab(tab) ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
            filterActive={guestAccountRequestsFilterActive(guestStatusFilter, guestSort)}
            onOpenFilter={() => setGuestFilterOpen(true)}
            showFilter
          />
        ) : (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
            showFilter={false}
            trailingAction={{
              onPress: () => setCreateOpen(true),
              accessibilityLabel: "New recommendation letter request",
            }}
          />
        )}
      </FacultyModuleStickyHeader>

      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[moduleStyles.content, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_RECOMMENDATIONS_COLOR.link} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={moduleStyles.errorBox}>
            <Text style={moduleStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isGuestTab(tab) ? (
          <FacultyGuestAccountRequestsPanel
            scope={scope}
            search={search}
            statusFilter={guestStatusFilter}
            sort={guestSort}
            filterSheetOpen={guestFilterOpen}
            onFilterSheetOpenChange={setGuestFilterOpen}
            onStatusFilterChange={setGuestStatusFilter}
            onSortChange={setGuestSort}
            onOpenPendingLetters={openPendingLetters}
            onPendingCountChange={setGuestPendingCount}
          />
        ) : loading ? (
          <View style={localStyles.loadingBox}>
            <ActivityIndicator size="large" color={FACULTY_RECOMMENDATIONS_COLOR.link} />
          </View>
        ) : filtered.length === 0 ? (
          <FacultyEmptyState
            icon="document-text-outline"
            title={requests.length === 0 ? "No letters yet" : "No matches"}
            body="Student recommendation requests will appear here."
          />
        ) : (
          <View style={localStyles.list}>
            {filtered.map((item) => (
              <FacultyRecommendationLetterCard key={item.id} item={item} onPress={() => openLetterWorkspace(item.id)} />
            ))}
          </View>
        )}
      </ScrollView>

      <FacultyRecommendationWorkspaceModal
        visible={selectedId != null}
        scope={scope}
        requestId={selectedId}
        initialTab={workspaceTab}
        onClose={() => {
          setSelectedId(null)
          setWorkspaceTab("overview")
        }}
        onUpdated={() => void handleRefresh()}
      />

      <FacultyRecommendationCreateModal
        visible={createOpen}
        scope={scope}
        sessions={sessions}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void handleRefresh()}
      />
    </View>
  )
}

const localStyles = StyleSheet.create({
  list: { gap: 12 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
})
