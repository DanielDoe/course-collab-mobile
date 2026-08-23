import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type InstructorAnnouncement} from "../../lib/instructor-api"
import {
  applyFacultyAnnouncementQuery,
  countFacultyAnnouncementsByFilter,
  type FacultyAnnouncementFilter} from "../../lib/faculty-announcement-utils"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { consumeFacultyCoraPending } from "../../lib/faculty-cora-pending"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useFacultyModuleStyles } from "../../lib/faculty-themed-ui"
import { announcementContentForSave } from "../../lib/announcement-content"
import { FacultyAnnouncementCard } from "./FacultyAnnouncementCard"
import { FacultyAnnouncementsInsight } from "./FacultyAnnouncementsInsight"
import {
  FacultyAnnouncementComposer,
  type ComposerDraft} from "./FacultyAnnouncementComposer"
import { FacultyAnnouncementDetailModal } from "./FacultyAnnouncementDetailModal"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyModuleScrollPadding, FacultyFilterSheet, FacultySearchToolbar } from "./faculty-module-shell"
import { useModuleTheme } from "../../lib/themed-module-shell"

const FILTER_OPTIONS: Array<{
  id: FacultyAnnouncementFilter
  label: string
}> = [
  { id: "all", label: "All announcements" },
  { id: "high", label: "Pinned / high priority" },
  { id: "active", label: "Active" },
]

export function FacultyAnnouncementsScreen() {
  const insets = useSafeAreaInsets()
  const scrollPad = useFacultyModuleScrollPadding(88)
  const tokens = useAppThemeTokens()
  const styles = useFacultyModuleStyles()
  const { styles: moduleStyles } = useModuleTheme()
  const { scope, ready, course } = useFacultyScope()

  const [announcements, setAnnouncements] = useState<InstructorAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FacultyAnnouncementFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const [composerOpen, setComposerOpen] = useState(false)
  const [composerInitialDraft, setComposerInitialDraft] = useState<ComposerDraft | null>(null)
  const [editing, setEditing] = useState<InstructorAnnouncement | null>(null)
  const [selected, setSelected] = useState<InstructorAnnouncement | null>(null)
  const [sessionOptions, setSessionOptions] = useState<Array<{ value: string; label: string }>>([])

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    try {
      const [items, sessionsRes] = await Promise.all([
        instructorApi.getAnnouncements(scope),
        instructorApi.getSessions(scope, scope.academicTermId ?? undefined).catch(() => ({ sessions: [] })),
      ])
      setAnnouncements(items)
      const seen = new Set<string>()
      setSessionOptions(
        (sessionsRes.sessions ?? [])
          .filter((session) => {
            if (!session.code || seen.has(session.code)) return false
            seen.add(session.code)
            return true
          })
          .map((session) => ({ value: session.code, label: session.code })),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load announcements.")
    }
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [ready, load])

  const filterCounts = useMemo(() => countFacultyAnnouncementsByFilter(announcements), [announcements])

  const filtered = useMemo(
    () => applyFacultyAnnouncementQuery(announcements, { search, filter }),
    [announcements, search, filter],
  )

  const filtersActive = filter !== "all"
  const hasActiveQuery = Boolean(search.trim()) || filtersActive
  const activeFilterLabel = FILTER_OPTIONS.find((opt) => opt.id === filter)?.label

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh("announcements", handleRefresh)

  useEffect(() => {
    if (!ready || !scope?.courseId) return
    void consumeFacultyCoraPending(scope.instructorId, scope.courseId, "announcement_draft").then((pending) => {
      if (pending?.kind === "announcement_draft") {
        setComposerInitialDraft({
          title: pending.title,
          content: pending.content,
          pinned: false,
          type: "info",
          priority: "medium",
          target_session: "all",
          expires_at: "",
          attachments: [],
        })
        setEditing(null)
        setComposerOpen(true)
      }
    })
  }, [ready, scope?.courseId, scope?.instructorId])

  function openCreate() {
    setEditing(null)
    setComposerInitialDraft(null)
    setComposerOpen(true)
  }

  function openEdit(item: InstructorAnnouncement) {
    setSelected(null)
    setEditing(item)
    // iOS needs the detail sheet to dismiss before presenting the composer sheet.
    setTimeout(() => setComposerOpen(true), 280)
  }

  async function handleSubmit(draft: ComposerDraft) {
    if (!scope) return
    setSubmitting(true)
    try {
      const originalContent = editing?.content ?? ""
      const content = announcementContentForSave(draft.content, originalContent || undefined)
      const payload = {
        title: draft.title.trim(),
        content,
        pinned: draft.pinned,
        type: draft.type,
        priority: draft.pinned ? "high" : draft.priority,
        target_session: draft.target_session || "all",
        expires_at: draft.expires_at || null,
        attachments: draft.attachments,
      }
      if (editing) {
        await instructorApi.updateAnnouncement(scope, editing.id, payload)
      } else {
        await instructorApi.createAnnouncement(scope, payload)
      }
      setComposerOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      AppAlert.alert(
        editing ? "Could not save" : "Could not publish",
        err instanceof ApiError ? err.message : "Try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(item: InstructorAnnouncement) {
    if (!scope) return
    try {
      await instructorApi.deleteAnnouncement(scope, item.id)
      setSelected(null)
      await load()
    } catch (err) {
      AppAlert.alert("Could not delete", err instanceof ApiError ? err.message : "Try again.")
    }
  }

  if (!ready) {
    return (
      <View style={[moduleStyles.center, styles.center]}>
        <FacultyEmptyState
          icon="book-outline"
          title="Select a course"
          body="Announcements are scoped to your active course."
        />
      </View>
    )
  }

  return (
    <View style={[moduleStyles.root, styles.root]}>
      <ScrollView
        style={[moduleStyles.scroll, styles.scroll]}
        contentContainerStyle={[styles.content, scrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={tokens.accent}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <FacultyAnnouncementsInsight
          showingCount={filtered.length}
          totalCount={filterCounts.all}
        />

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search title, summary, section…"
          filterActive={filtersActive}
          filterLabel={activeFilterLabel}
          onOpenFilter={() => setFilterSheetOpen(true)}
          trailingAction={{
            onPress: openCreate,
            accessibilityLabel: "New announcement"}}
        />

        <FacultyFilterSheet
          visible={filterSheetOpen}
          title="Filter announcements"
          subtitle="Show all updates or focus on pinned, high priority, or active posts."
          options={FILTER_OPTIONS.map((opt) => ({
            value: opt.id,
            label:
              opt.id === "all"
                ? opt.label
                : `${opt.label}${filterCounts[opt.id] > 0 ? ` · ${filterCounts[opt.id]}` : ""}`,
          }))}
          value={filter}
          onSelect={(value) => {
            setFilter(value as FacultyAnnouncementFilter)
            setFilterSheetOpen(false)
          }}
          onClose={() => setFilterSheetOpen(false)}
        />

        {hasActiveQuery ? (
          <View style={styles.resultsRow}>
            <Text style={styles.resultsText}>
              {filtered.length} of {announcements.length} announcement
              {announcements.length === 1 ? "" : "s"}
            </Text>
            <Pressable
              onPress={() => {
                setSearch("")
                setFilter("all")
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search and filters"
            >
              <Text style={styles.clearBtn}>Clear</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={localStyles.loadingBox}>
            <ActivityIndicator size="large" color={tokens.accent} />
          </View>
        ) : announcements.length === 0 ? (
          <FacultyEmptyState
            icon="megaphone-outline"
            title="No announcements yet"
            body="Use + in the search bar to post your first update to students."
          />
        ) : filtered.length === 0 ? (
          <FacultyEmptyState
            icon="search-outline"
            title="No matches"
            body="Try a different search or reset your filters."
          />
        ) : (
          <View style={localStyles.list}>
            {filtered.map((item, index) => (
              <FacultyAnnouncementCard
                key={item.id}
                item={item}
                index={index}
                onPress={() => setSelected(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FacultyAnnouncementComposer
        visible={composerOpen}
        editing={editing}
        initialDraft={composerInitialDraft}
        courseCode={course?.course_code}
        submitting={submitting}
        sessionOptions={sessionOptions}
        onUploadAttachment={(file) => instructorApi.uploadAnnouncementAttachment(scope!, file)}
        onClose={() => {
          setComposerOpen(false)
          setEditing(null)
          setComposerInitialDraft(null)
        }}
        onSubmit={(draft) => void handleSubmit(draft)}
      />

      <FacultyAnnouncementDetailModal
        item={selected}
        scope={scope}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onDelete={(item) => void handleDelete(item)}
      />
    </View>
  )
}

const localStyles = StyleSheet.create({
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  list: { gap: 10 },
})
