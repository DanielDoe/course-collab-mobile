import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { ApiError, type QuizItem, type QuizListRolloverPolicy } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { assessmentIssuesApi } from "../../lib/assessment-issues-api"
import { ModuleSectionHeader } from "../modules/ModuleScreen"
import { AssessmentFilterBar, type AssessmentFilter } from "./AssessmentFilterBar"
import { AssessmentItemCard } from "./AssessmentItemCard"
import { AssessmentIssuesSheet } from "./AssessmentIssuesSheet"
import { openAssessmentDetail, openAssessmentTake } from "./assessment-navigation"
import {
  getAssessmentConfigs,
  type AssessmentListKind,
  issuesAssessmentType,
} from "./assessment-config"
import {
  assessmentListEmptyCopy,
  fetchAssessmentListForKind,
  quizItemCardScore,
  quizItemIsDone,
  quizItemListStatus,
} from "./assessment-list-logic"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type Filter = AssessmentFilter

type Props = {
  type: AssessmentListKind | string
  title?: string
}

export function AssessmentListScreen({ type, title }: Props) {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const configs = getAssessmentConfigs(tokens)
  const config =
    type in configs ? configs[type as AssessmentListKind] : configs.quiz

  const [items, setItems] = useState<QuizItem[]>([])
  const [rolloverPolicy, setRolloverPolicy] = useState<QuizListRolloverPolicy | undefined>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [issuesOpen, setIssuesOpen] = useState(false)
  const [openIssueCount, setOpenIssueCount] = useState(0)

  const issuesType = issuesAssessmentType(type)

  const loadIssueCount = useCallback(async () => {
    if (!session) return
    try {
      const res = await assessmentIssuesApi.list(session, issuesType, "open")
      setOpenIssueCount(res.issues?.length ?? 0)
    } catch {
      setOpenIssueCount(0)
    }
  }, [session, issuesType])

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const list = await fetchAssessmentListForKind(session, type)
      setItems(list.items)
      setRolloverPolicy(list.rolloverPolicy)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load assessments.")
      setItems([])
      setRolloverPolicy(undefined)
    }
  }, [session, type])

  useEffect(() => {
    setLoading(true)
    Promise.all([load(), loadIssueCount()]).finally(() => setLoading(false))
  }, [load, loadIssueCount])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([load(), loadIssueCount()])
    setRefreshing(false)
  }, [load, loadIssueCount])

  useNotificationModuleRefresh(["assessments", "issues"], onRefresh)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (q && !item.title.toLowerCase().includes(q)) return false
      const done = quizItemIsDone(item)
      if (filter === "done") return done
      if (filter === "open") return !done
      return true
    })
  }, [items, filter, search])

  const openSection = filtered.filter((i) => !quizItemIsDone(i))
  const doneSection = filtered.filter((i) => quizItemIsDone(i))

  const displayTitle = title ?? config.title
  const emptyCopy = useMemo(
    () => assessmentListEmptyCopy(type, rolloverPolicy, displayTitle),
    [type, rolloverPolicy, displayTitle],
  )

  const isRefreshing = loading || refreshing

  return (
    <ModuleScreen
      loading={loading}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      error={error}
    >
      <AssessmentFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${displayTitle.toLowerCase()}…`}
        filter={filter}
        onFilterChange={setFilter}
        openIssueCount={openIssueCount}
        onOpenIssues={() => setIssuesOpen(true)}
      />

      {!isRefreshing && items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FacultyEmptyState
            icon={config.icon}
            title={emptyCopy.title}
            body={emptyCopy.body}
          />
          <Pressable
            style={({ pressed }) => [
              styles.refreshBtn,
              { backgroundColor: tokens.accentSoft, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => void onRefresh()}
            accessibilityRole="button"
            accessibilityLabel="Refresh assessments"
          >
            <Ionicons name="refresh-outline" size={18} color={tokens.accent} />
            <Text style={[styles.refreshBtnText, { color: tokens.accent }]}>Refresh</Text>
          </Pressable>
          <Text style={[styles.refreshHint, { color: tokens.textSecondary }]}>
            Or pull down anywhere on this screen to refresh.
          </Text>
        </View>
      ) : null}

      {!isRefreshing && items.length > 0 && filtered.length === 0 ? (
        <View style={styles.emptyFilter}>
          <Text style={{ color: tokens.textSecondary }}>No matches for your search or filter.</Text>
        </View>
      ) : null}

      {filtered.length > 0 ? (
        filter === "all" ? (
          <>
            {openSection.length > 0 ? (
              <>
                <ModuleSectionHeader title="Open Now" />
                <View style={styles.list}>
                  {openSection.map((item, index) => {
                    const listStatus = quizItemListStatus(item)
                    return (
                      <AssessmentItemCard
                        key={item.id}
                        index={index}
                        title={item.title}
                        dueUntil={item.available_until}
                        bestScore={quizItemCardScore(item)}
                        statusLabel={listStatus.label}
                        statusTone={listStatus.pillTone}
                        attemptsUsed={item.attempts_used}
                        retakeLimit={item.retake_limit}
                        icon={config.icon}
                        onPress={() => {
                          if (listStatus.label === "Continue") {
                            openAssessmentTake(router, type, item.id, "continue")
                            return
                          }
                          openAssessmentDetail(router, type, item.id, item.assessment_type)
                        }}
                      />
                    )
                  })}
                </View>
              </>
            ) : null}
            {doneSection.length > 0 ? (
              <>
                <ModuleSectionHeader title="Completed & Closed" />
                <View style={styles.list}>
                  {doneSection.map((item, index) => {
                    const listStatus = quizItemListStatus(item)
                    return (
                      <AssessmentItemCard
                        key={item.id}
                        index={index}
                        title={item.title}
                        dueUntil={item.available_until}
                        bestScore={quizItemCardScore(item)}
                        statusLabel={listStatus.label}
                        statusTone={listStatus.pillTone}
                        attemptsUsed={item.attempts_used}
                        retakeLimit={item.retake_limit}
                        icon={config.icon}
                        onPress={() => {
                          if (listStatus.label === "Continue") {
                            openAssessmentTake(router, type, item.id, "continue")
                            return
                          }
                          openAssessmentDetail(router, type, item.id, item.assessment_type)
                        }}
                      />
                    )
                  })}
                </View>
              </>
            ) : null}
          </>
        ) : (
          <>
            <ModuleSectionHeader title={filter === "open" ? "Open Now" : "Completed & Closed"} />
            <View style={styles.list}>
              {filtered.map((item, index) => {
                const listStatus = quizItemListStatus(item)
                return (
                  <AssessmentItemCard
                    key={item.id}
                    index={index}
                    title={item.title}
                    dueUntil={item.available_until}
                    bestScore={quizItemCardScore(item)}
                    statusLabel={listStatus.label}
                    statusTone={listStatus.pillTone}
                    attemptsUsed={item.attempts_used}
                    retakeLimit={item.retake_limit}
                    icon={config.icon}
                    onPress={() => {
                      if (listStatus.label === "Continue") {
                        openAssessmentTake(router, type, item.id, "continue")
                        return
                      }
                      openAssessmentDetail(router, type, item.id, item.assessment_type)
                    }}
                  />
                )
              })}
            </View>
          </>
        )
      ) : null}

      {session ? (
        <AssessmentIssuesSheet
          visible={issuesOpen}
          onClose={() => setIssuesOpen(false)}
          session={session}
          assessmentType={issuesType}
          assessmentLabel={displayTitle}
          quizzes={items}
          initialTab="report"
          onIssuesChanged={loadIssueCount}
        />
      ) : null}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    marginBottom: 8,
  },
  emptyWrap: {
    gap: 12,
    paddingBottom: 24,
  },
  refreshBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  refreshBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  refreshHint: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 24,
  },
  emptyFilter: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
})
