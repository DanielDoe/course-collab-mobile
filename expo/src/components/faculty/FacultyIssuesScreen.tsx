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
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { filterIssues, type AssessmentType, type IssueStatusFilter } from "../../lib/faculty-assessment-utils"
import { formatFacultyRelativeTime, instructorApi, type InstructorIssue } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultyIssueDetailModal } from "./FacultyIssueDetailModal"
import { useFacultyStickyHeaderScrollLayout, FacultyFilterSheet, FacultySearchToolbar } from "./faculty-module-shell"

export function FacultyIssuesScreen({
  assessmentType = "quiz",
  onCountsChange,
}: {
  assessmentType?: AssessmentType
  onCountsChange?: (openCount: number) => void
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, session, ready } = useFacultyScope()
  const { refreshFacultyData } = useFacultyShell()

  const [openIssues, setOpenIssues] = useState<InstructorIssue[]>([])
  const [closedIssues, setClosedIssues] = useState<InstructorIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [status, setStatus] = useState<IssueStatusFilter>("open")
  const [search, setSearch] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selected, setSelected] = useState<InstructorIssue | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    const [open, closed] = await Promise.all([
      instructorApi.getIssues(scope, "open", assessmentType),
      instructorApi.getIssues(scope, "closed", assessmentType),
    ])
    setOpenIssues(open)
    setClosedIssues(closed)
    onCountsChange?.(open.length)
  }, [scope, assessmentType, onCountsChange])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [ready, load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([load(), refreshFacultyData?.(undefined, { force: true })])
    } finally {
      setRefreshing(false)
    }
  }, [load, refreshFacultyData])

  useNotificationModuleRefresh("issues", handleRefresh)

  async function handleUpdated() {
    if (!scope) return
    const [open, closed] = await Promise.all([
      instructorApi.getIssues(scope, "open", assessmentType),
      instructorApi.getIssues(scope, "closed", assessmentType),
    ])
    setOpenIssues(open)
    setClosedIssues(closed)
    await refreshFacultyData?.(undefined, { force: true })
    if (selected) {
      const fresh = [...open, ...closed].find((i) => i.id === selected.id)
      setSelected(fresh ?? null)
    }
  }

  const source = status === "open" ? openIssues : closedIssues
  const filtered = useMemo(() => filterIssues(source, status, search), [source, status, search])
  const pager = useFacultyListPager(filtered, `${status}:${search}`, "issues")

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="alert-circle-outline"
          title="Select a course"
          body="Submission issues are scoped to your active course."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={tokens.accent} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search student, assessment, issue…"
          filterActive={status !== "open"}
          filterLabel={status === "closed" ? "Closed issues" : "Open issues"}
          onOpenFilter={() => setFilterSheetOpen(true)}
        />

        {status === "closed" ? (
          <Pressable style={styles.activeFilter} onPress={() => setStatus("open")}>
            <FacultyStatusPill label="Closed issues" tone="neutral" />
            <Text style={[type.caption, { color: tokens.accent, fontWeight: "700" }]}>Show open</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={tokens.accent} size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <FacultyEmptyState
            icon={status === "open" ? "checkmark-circle-outline" : "archive-outline"}
            title={status === "open" ? "No open issues" : "No closed issues"}
            body={
              status === "open"
                ? "Student-reported submission issues will appear here."
                : "Resolved issues will be listed here."
            }
          />
        ) : (
          <View style={styles.list}>
            {pager.items.map((issue) => (
              <Pressable
                key={issue.id}
                style={({ pressed }) => [moduleStyles.card, styles.card, pressed && moduleStyles.cardPressed]}
                onPress={() => setSelected(issue)}
              >
                <View style={styles.cardHead}>
                  <FacultyStatusPill
                    label={status === "open" ? "Open" : "Closed"}
                    tone={status === "open" ? "warning" : "neutral"}
                  />
                  {(issue.comment_count ?? 0) > 0 ? (
                    <View style={styles.commentBadge}>
                      <Ionicons name="chatbubble-outline" size={12} color={native.secondaryLabel} />
                      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700", fontSize: 11 }]}>
                        {issue.comment_count}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[type.caption, { marginLeft: "auto", color: native.tertiaryLabel, fontWeight: "600" }]}>
                    {formatFacultyRelativeTime(issue.created_at)}
                  </Text>
                </View>
                <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
                  {issue.quiz_title ?? "Assessment issue"}
                  {issue.question_number != null ? ` · Q${issue.question_number}` : ""}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>
                  {issue.student_name ?? "Student"}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20 }]} numberOfLines={3}>
                  {issue.description}
                </Text>
              </Pressable>
            ))}
            <FacultyListPagerFooter pager={pager} />
          </View>
        )}
      </ScrollView>

      <FacultyFilterSheet
        visible={filterSheetOpen}
        title="Issue status"
        subtitle="View open reports or resolved issues."
        value={status}
        options={[
          { value: "open", label: `Open (${openIssues.length})` },
          { value: "closed", label: `Closed (${closedIssues.length})` },
        ]}
        onSelect={(value) => {
          setStatus(value as IssueStatusFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <FacultyIssueDetailModal
        issue={selected}
        scope={scope}
        instructorName={session?.name ?? "Instructor"}
        instructorId={session?.id ?? 0}
        onClose={() => setSelected(null)}
        onUpdated={() => void handleUpdated()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  activeFilter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  list: { gap: 12 },
  card: { gap: 6 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
})
