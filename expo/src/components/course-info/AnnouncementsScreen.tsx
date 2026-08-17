import { useCallback, useEffect, useMemo, useState } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { ModuleScreen, ModuleSection, ModuleShowMoreRow } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { ApiError, type Announcement } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { courseInfoApi, formatListDate } from "../../lib/course-info-api"
import { summarizeAnnouncement } from "../../lib/announcement-summary"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import {
  announcementAttachmentCount,
  applyAnnouncementListQuery,
  countAnnouncementsByFilter,
  isAnnouncementUnread,
  type AnnouncementFilter,
  type AnnouncementSort,
} from "../../lib/announcement-list-utils"
import { EmptyBlock } from "../rewards/rewards-shared"
import { StatusBadge } from "./course-info-shared"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { solidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { NativeCountBadge } from "../faculty/faculty-shared"
import { StudentGroupedFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function formatRelativeDate(value?: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return formatListDate(value) ?? ""
}

/** ModuleScreen renders inside a plain ScrollView — page the list instead of mounting every row. */
const PAGE_SIZE = 20

const FILTER_OPTIONS: Array<{
  id: AnnouncementFilter
  label: string
}> = [
  { id: "all", label: "All announcements" },
  { id: "unread", label: "Unread" },
  { id: "pinned", label: "Pinned" },
  { id: "files", label: "Has files" },
]

const SORT_OPTIONS: Array<{
  id: AnnouncementSort
  label: string
}> = [
  { id: "smart", label: "Smart order" },
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "active", label: "Most active" },
]

function AnnouncementListCard({
  item,
  index,
  onPress,
  last,
}: {
  item: Announcement
  index: number
  onPress: () => void
  last?: boolean
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const solidThumb = solidListThumb(index)
  const isUnread = isAnnouncementUnread(item)
  const locked = item.student_content_locked === true
  const attachmentCount = announcementAttachmentCount(item)
  const summary = summarizeAnnouncement(item.content ?? "", {
    title: item.title,
    locked,
    aiSummary: item.ai_summary,
  })

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: native.separator },
        last && styles.rowLast,
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      android_ripple={Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined}
    >
      <SolidListThumbTile thumb={solidThumb} icon="megaphone-outline" size="compact" />
      <View style={styles.rowCopy}>
        <View style={styles.badgeRow}>
          {item.pinned ? <StatusBadge label="Pinned" tone="purple" /> : null}
          {isUnread ? <StatusBadge label="New" tone="warning" /> : null}
          {locked ? <StatusBadge label="Locked" tone="neutral" /> : null}
        </View>
        <Text style={[type.bodyEmphasis, isUnread && styles.titleUnread]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[type.caption, styles.summaryText]} numberOfLines={2}>
          {summary}
        </Text>
        <Text style={type.footnote} numberOfLines={1}>
          {[item.author_name, formatRelativeDate(item.created_at)].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View style={styles.rowTrailing}>
        {attachmentCount > 0 ? <NativeCountBadge count={attachmentCount} variant="compact" /> : null}
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
      </View>
    </Pressable>
  )
}

export function AnnouncementsScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<AnnouncementFilter>("all")
  const [sort, setSort] = useState<AnnouncementSort>("smart")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await courseInfoApi.getAnnouncements(session)
      setAnnouncements(data.announcements ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load announcements.")
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

  useNotificationModuleRefresh("announcements", onRefresh)

  const filterCounts = useMemo(() => countAnnouncementsByFilter(announcements), [announcements])

  const filtered = useMemo(
    () => applyAnnouncementListQuery(announcements, { search, filter, sort }),
    [announcements, search, filter, sort],
  )

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, filter, sort])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  const hasActiveQuery = Boolean(search.trim()) || filter !== "all" || sort !== "smart"
  const filtersActive = filter !== "all" || sort !== "smart"

  const filterGroups = useMemo(
    () => [
      {
        id: "filter",
        title: "Show",
        value: filter,
        options: FILTER_OPTIONS.map((opt) => ({
          value: opt.id,
          label:
            opt.id === "all"
              ? opt.label
              : `${opt.label}${filterCounts[opt.id] > 0 ? ` · ${filterCounts[opt.id]}` : ""}`,
        })),
      },
      {
        id: "sort",
        title: "Sort",
        value: sort,
        options: SORT_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label })),
      },
    ],
    [filter, sort, filterCounts],
  )

  const clearQuery = () => {
    setSearch("")
    setFilter("all")
    setSort("smart")
  }

  if (!session) return null

  return (
    <ModuleScreen
      loading={loading}
      error={error}
      empty={!loading && announcements.length === 0}
      emptyTitle="No announcements"
      emptyBody="Course updates from your instructor will appear here."
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <StudentSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search title, summary, instructor…"
        filterActive={filtersActive}
        onOpenFilter={() => setFilterSheetOpen(true)}
      />

      <StudentGroupedFilterSheet
        visible={filterSheetOpen}
        title="Filters"
        subtitle="Choose what to show and how to sort announcements."
        groups={filterGroups}
        onSelect={(groupId, value) => {
          if (groupId === "filter") setFilter(value as AnnouncementFilter)
          if (groupId === "sort") setSort(value as AnnouncementSort)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      {hasActiveQuery ? (
        <View style={styles.resultsBar}>
          <Text style={[type.caption, styles.resultsText]}>
            {filtered.length} of {announcements.length} announcement
            {announcements.length === 1 ? "" : "s"}
            {search.trim() ? ` matching “${search.trim()}”` : ""}
          </Text>
          <Pressable onPress={clearQuery} hitSlop={8}>
            <Text style={[styles.clearBtn, { color: SN.uiAccent }]}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      {announcements.length > 0 && filtered.length === 0 ? (
        <EmptyBlock
          icon="search-outline"
          title="No matches"
          body="Try a different search term or reset your filters."
        />
      ) : (
        <ModuleSection>
          {visible.map((item, index) => (
            <AnnouncementListCard
              key={item.id}
              item={item}
              index={index}
              last={index === visible.length - 1}
              onPress={() =>
                router.push({
                  pathname: "/announcements/[id]",
                  params: { id: String(item.id) },
                } as never)
              }
            />
          ))}
          <ModuleShowMoreRow
            remaining={filtered.length - visible.length}
            onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          />
        </ModuleSection>
      )}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 2,
  },
  resultsText: { flex: 1, lineHeight: 18 },
  clearBtn: { fontSize: 13, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  iconTile: {
    width: NATIVE.iconTileSize,
    height: NATIVE.iconTileSize,
    borderRadius: NATIVE.iconTileRadius,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  rowCopy: { flex: 1, gap: 4 },
  rowTrailing: { alignItems: "flex-end", gap: 8, paddingTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  titleUnread: { fontWeight: NATIVE.titleWeight },
  summaryText: { lineHeight: 18 },
})
