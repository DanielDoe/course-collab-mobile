import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { mergeAssessmentHistoryById, quizHistoryToAssessmentItems } from "../../lib/assessment-history-map"
import { ApiError, studentApi, type AssessmentHistoryItem } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { CommEmptyState } from "../faculty/faculty-communication-ui"
import { HistoryFilterBar } from "./HistoryFilterBar"
import { AssessmentHistoryTimelineItem } from "./AssessmentHistoryTimelineItem"
import { formatAssessmentType } from "./assessment-config"
import { openHistoryItem } from "./assessment-navigation"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function historyBestScore(item: AssessmentHistoryItem): number | null {
  if (item.best_score != null) return item.best_score
  const attempts = item.attempts ?? []
  const percentages = attempts
    .map((a) => a.percentage)
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
  if (percentages.length === 0) return null
  return Math.max(...percentages)
}

function historyCompletedAt(item: AssessmentHistoryItem): string | undefined {
  if (item.completed_at) return item.completed_at
  const attempts = item.attempts ?? []
  const latest = attempts
    .filter((a) => a.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0]
  return latest?.completed_at ?? undefined
}

function formatWhen(value?: string): string {
  if (!value) return "Date unknown"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function historyStatusLabel(item: AssessmentHistoryItem): string {
  const normalized = (item.status ?? "").toLowerCase().replace(/_/g, " ")
  if (normalized.includes("complete")) return "Completed"
  if (normalized.includes("pending")) return "Pending"
  if (normalized.includes("progress")) return "In Progress"
  if (historyBestScore(item) != null || historyCompletedAt(item)) return "Completed"
  return "Pending"
}

function historyStatusTone(item: AssessmentHistoryItem): "success" | "neutral" | "live" {
  const label = historyStatusLabel(item)
  if (label === "Completed") return "success"
  if (label === "In Progress") return "live"
  return "neutral"
}

function historySortTime(item: AssessmentHistoryItem): number {
  const at = historyCompletedAt(item)
  if (!at) return historyStatusLabel(item) === "Pending" ? -1 : 0
  const t = new Date(at).getTime()
  return Number.isNaN(t) ? 0 : t
}

function showTypeSubtitle(type: string): boolean {
  const normalized = type.toLowerCase()
  return normalized.includes("homework") || normalized === "quiz" || normalized.includes("quiz")
}

export function QuizHistoryScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const scrollPad = useModuleScrollContentPadding()

  const [items, setItems] = useState<AssessmentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const quizPayload = await studentApi.getQuizHistory(session)
      const mapped = quizHistoryToAssessmentItems(quizPayload.quizHistory ?? quizPayload)

      let assessmentRows: AssessmentHistoryItem[] = []
      try {
        const assessmentPayload = await studentApi.getAssessmentHistory(session)
        assessmentRows = assessmentPayload.history ?? assessmentPayload.assessmentHistory ?? []
      } catch {
        // assessment-history is optional overlay; quiz-history is the required list.
      }

      setItems(assessmentRows.length > 0 ? mergeAssessmentHistoryById(mapped, assessmentRows) : mapped)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load history.")
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

  useNotificationModuleRefresh(["assessments", "grades"], onRefresh)

  const types = useMemo(() => {
    const set = new Set(items.map((i) => i.assessment_type).filter(Boolean))
    return Array.from(set)
  }, [items])

  useEffect(() => {
    if (typeFilter !== "all" && !types.includes(typeFilter)) {
      setTypeFilter("all")
    }
  }, [typeFilter, types])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = items.filter((item) => {
      if (typeFilter !== "all" && item.assessment_type !== typeFilter) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        formatAssessmentType(item.assessment_type).toLowerCase().includes(q)
      )
    })
    return list.sort((a, b) => historySortTime(b) - historySortTime(a))
  }, [items, search, typeFilter])

  const scrollContentStyle = useMemo(
    () => ({
      paddingHorizontal: NATIVE.pagePadding,
      paddingBottom: scrollPad.paddingBottom,
      flexGrow: 1,
    }),
    [scrollPad.paddingBottom],
  )

  if (!session) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>Student session required.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <View
        style={[
          styles.chrome,
          {
            paddingTop: scrollPad.paddingTop ?? NATIVE.pagePadding,
            paddingHorizontal: NATIVE.pagePadding,
          },
        ]}
      >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}18` }]}>
            <Text style={[type.destructive, styles.errorText]}>{error}</Text>
            <Pressable
              onPress={() => void onRefresh()}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              hitSlop={8}
            >
              <Text style={[type.callout, { color: tokens.accent, fontWeight: "600" }]}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <HistoryFilterBar
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          types={types}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading history…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            items.length === 0 ? [scrollContentStyle, styles.emptyScroll] : scrollContentStyle
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
          }
        >
          {items.length === 0 ? (
            <View style={styles.emptyBlock}>
              <CommEmptyState
                icon="time-outline"
                title="No assessment history"
                body="Your completed quizzes and exams will appear here."
              />
              <Pressable
                onPress={() => void onRefresh()}
                accessibilityRole="button"
                accessibilityLabel="Try again"
                hitSlop={8}
              >
                <Text style={[type.callout, { color: tokens.accent, fontWeight: "600" }]}>Try again</Text>
              </Pressable>
            </View>
          ) : filtered.length > 0 ? (
            <View style={styles.timelineList}>
              {filtered.map((item, index) => (
                <AssessmentHistoryTimelineItem
                  key={`${item.id}-${item.assessment_type}`}
                  item={item}
                  index={index}
                  last={index === filtered.length - 1}
                  bestScore={historyBestScore(item)}
                  completedAt={historyCompletedAt(item)}
                  statusLabel={historyStatusLabel(item)}
                  statusTone={historyStatusTone(item)}
                  showTypeSubtitle={showTypeSubtitle(item.assessment_type)}
                  formatWhen={formatWhen}
                  onPress={() => openHistoryItem(router, item)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyFilter}>
              <Text style={[type.caption, { color: SN.secondaryLabel }]}>
                No history matches your search or filter.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: { gap: 12, paddingBottom: 4 },
  scroll: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  errorBox: { padding: 12, borderRadius: NATIVE.sectionRadius, gap: 8 },
  errorText: { fontSize: 14, lineHeight: 20 },
  timelineList: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  emptyFilter: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  emptyScroll: {
    justifyContent: "center",
  },
  emptyBlock: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
})
