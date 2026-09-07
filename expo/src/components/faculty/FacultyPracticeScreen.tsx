import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type InstructorSession,
  type PracticeActivityItem,
  type PracticeAnalytics,
  type PracticeStudentProgress,
  type PracticeTopic} from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NATIVE } from "../../constants/faculty-native-theme"
import { studentInitials } from "../../lib/faculty-students-utils"
import {
  FACULTY_PRACTICE_COLOR,
  facultyPracticeActivityThumb,
  facultyPracticeStudentThumb,
  facultyPracticeTopicThumb,
} from "../../lib/faculty-practice-theme"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultyPracticeListCard } from "./FacultyPracticeListCard"
import { FacultySheetNotice } from "./faculty-collab-sheet-ui"
import { useFacultyStickyHeaderScrollLayout,
  FacultyFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  sessionFilterDisplayLabel} from "./faculty-module-shell"
import {
  FacultyPracticeStudentActionSheet,
  FacultyPracticeTopicActionSheet} from "./FacultyPracticeActionSheets"
import {
  FacultyPracticeConfigureModal,
  practiceStudentAttempts,
  practiceStudentName,
  practiceStudentScore} from "./FacultyPracticeModals"
import { FacultyPracticeStudentReportModal } from "./FacultyPracticeStudentReportModal"
import { FacultyPracticeTopicQuestionsModal } from "./FacultyPracticeTopicQuestionsModal"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"

type Tab = "topics" | "students" | "analytics" | "activity"

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "topics", label: "Topics" },
  { id: "students", label: "Students" },
  { id: "analytics", label: "Stats" },
  { id: "activity", label: "Activity" },
]

function topicAvailability(topic: PracticeTopic, session: string) {
  return topic.availability[session] ?? topic.availability.ALL
}

function topicScore(row: { avgScore?: number; accuracy?: number }): number {
  return row.avgScore ?? row.accuracy ?? 0
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function FacultyPracticeScreen() {
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout({ extraBottom: 88 })
  const { tokens, styles } = useModuleTheme()
  const { scope, ready, session } = useFacultyScope()
  const { courses, openCoursePicker } = useFacultyShell()
  const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false)

  const [tab, setTab] = useState<Tab>("topics")
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [topicSession, setTopicSession] = useState("ALL")
  const [studentSession, setStudentSession] = useState("ALL")
  const [studentTopic, setStudentTopic] = useState("ALL")

  const [topics, setTopics] = useState<PracticeTopic[]>([])
  const [students, setStudents] = useState<PracticeStudentProgress[]>([])
  const [analytics, setAnalytics] = useState<PracticeAnalytics>({})
  const [bankAvailable, setBankAvailable] = useState(true)
  const [bankMessage, setBankMessage] = useState("")

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [acting, setActing] = useState(false)

  const [sessionFilterOpen, setSessionFilterOpen] = useState(false)
  const [studentFilterOpen, setStudentFilterOpen] = useState(false)
  const [configureOpen, setConfigureOpen] = useState(false)

  const [selectedTopic, setSelectedTopic] = useState<PracticeTopic | null>(null)
  const [topicQuestionsTopic, setTopicQuestionsTopic] = useState<PracticeTopic | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<PracticeStudentProgress | null>(null)
  const [reportStudent, setReportStudent] = useState<PracticeStudentProgress | null>(null)
  const listRef = useRef<ScrollView>(null)

  const uniqueSessions = useMemo(
    () => sessions.filter((session, index, list) => list.findIndex((row) => row.code === session.code) === index),
    [sessions],
  )

  const loadTopics = useCallback(async () => {
    if (!scope) return
    const topicsRes = await instructorApi.getPracticeTopics(scope, topicSession)
    setTopics(topicsRes.topics ?? [])
    setBankAvailable(topicsRes.practiceBankAvailable ?? true)
    setBankMessage(topicsRes.message ?? "")
  }, [scope, topicSession])

  const loadCore = useCallback(async () => {
    if (!scope) return
    setError("")
    const [studentRows, analyticsData, sessionsRes] = await Promise.all([
      instructorApi.getPracticeStudentProgress(scope),
      instructorApi.getPracticeAnalytics(scope),
      instructorApi.getSessions(scope).catch(() => ({ sessions: [] as InstructorSession[] })),
    ])
    setStudents(studentRows)
    setAnalytics(analyticsData)
    setSessions(sessionsRes.sessions ?? [])
    if ("practiceBankAvailable" in analyticsData && analyticsData.practiceBankAvailable === false) {
      setBankAvailable(false)
    }
  }, [scope])

  const load = useCallback(async () => {
    if (!scope) return
    await Promise.all([loadTopics(), loadCore()])
  }, [scope, loadTopics, loadCore])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load practice data."))
      .finally(() => setLoading(false))
  }, [ready, load])

  useEffect(() => {
    if (!ready || !scope) return
    loadTopics().catch((err) =>
      setError(err instanceof ApiError ? err.message : "Could not load practice topics."),
    )
  }, [ready, scope, topicSession, loadTopics])

  const topicNames = useMemo(() => topics.map((t) => t.name), [topics])

  const filteredTopics = useMemo(() => {
    if (!search.trim()) return topics
    const q = search.trim().toLowerCase()
    return topics.filter((t) => t.name.toLowerCase().includes(q))
  }, [topics, search])

  const filteredStudents = useMemo(() => {
    let rows = students
    if (studentSession !== "ALL") {
      rows = rows.filter((s) => (s.student_section ?? s.session ?? "") === studentSession)
    }
    if (studentTopic !== "ALL") {
      rows = rows.filter((s) => (s.topics_practiced ?? []).includes(studentTopic))
    }
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter(
      (s) =>
        practiceStudentName(s).toLowerCase().includes(q) ||
        (s.student_number?.toLowerCase().includes(q) ?? false),
    )
  }, [students, search, studentSession, studentTopic])

  const topicPerformance = analytics.topicPerformance ?? []
  const dailyTrends = analytics.dailyTrends ?? []
  const recentActivity = analytics.recentActivity ?? []

  const topicsPager = useFacultyListPager(filteredTopics, `${search}:${topicSession}`, "topics")
  const studentsPager = useFacultyListPager(
    filteredStudents,
    `${search}:${studentSession}:${studentTopic}`,
    "students",
  )
  const activityPager = useFacultyListPager(recentActivity, "activity", "activities")

  const topicScopeLabel = sessionFilterDisplayLabel(uniqueSessions, topicSession)

  useEffect(() => {
    listRef.current?.scrollTo({ y: 0, animated: false })
  }, [search, tab, topicSession, studentSession, studentTopic])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh practice data.")
    } finally {
      setRefreshing(false)
    }
  }

  async function runAction(action: () => Promise<unknown>): Promise<boolean> {
    setActing(true)
    setError("")
    try {
      await action()
      await load()
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.")
      return false
    } finally {
      setActing(false)
    }
  }

  function openStudentReport(student: PracticeStudentProgress) {
    setSelectedStudent(null)
    setTimeout(() => setReportStudent(student), 280)
  }

  useEffect(() => {
    if (ready) {
      setBootstrapTimedOut(false)
      return
    }
    const timer = setTimeout(() => setBootstrapTimedOut(true), 12_000)
    return () => clearTimeout(timer)
  }, [ready])

  if (!session) return null

  if (!ready) {
    const bootstrapping = courses.length === 0 && !bootstrapTimedOut
    return (
      <View style={styles.center}>
        {bootstrapping ? (
          <ActivityIndicator color={FACULTY_PRACTICE_COLOR.link} size="large" />
        ) : (
          <>
            <FacultyEmptyState
              icon="bulb-outline"
              title="Select a course"
              body={
                bootstrapTimedOut && courses.length === 0
                  ? "Could not load courses. Check your connection, then choose a course."
                  : "Practice management requires an active course."
              }
            />
            <Pressable
              style={[localStyles.chooseCourseBtn, { backgroundColor: FACULTY_PRACTICE_COLOR.action }]}
              onPress={openCoursePicker}
              accessibilityRole="button"
              accessibilityLabel="Choose course"
            >
              <Text style={localStyles.chooseCourseBtnText}>Choose course</Text>
            </Pressable>
          </>
        )}
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} scrollable={false} />

        {tab === "topics" ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search topics…"
            filterActive={topicSession !== "ALL"}
            filterLabel={topicScopeLabel}
            onOpenFilter={() => setSessionFilterOpen(true)}
            trailingAction={{
              onPress: () => setConfigureOpen(true),
              accessibilityLabel: "Configure practice",
              icon: "settings-outline",
            }}
          />
        ) : tab === "students" ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search students…"
            filterActive={studentSession !== "ALL" || studentTopic !== "ALL"}
            filterLabel={
              studentTopic !== "ALL"
                ? studentTopic
                : studentSession !== "ALL"
                  ? `Section ${studentSession}`
                  : "Filters"
            }
            onOpenFilter={() => setStudentFilterOpen(true)}
          />
        ) : null}
      </FacultyModuleStickyHeader>

      <ScrollView
        ref={listRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_PRACTICE_COLOR.link}
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

        {loading ? (
          <ActivityIndicator color={FACULTY_PRACTICE_COLOR.link} style={localStyles.loader} />
        ) : tab === "topics" ? (
          !bankAvailable ? (
            <FacultyEmptyState
              icon="bulb-outline"
              title="Practice bank unavailable"
              body={bankMessage || "This course does not use the shared practice bank."}
            />
          ) : filteredTopics.length === 0 ? (
            <FacultyEmptyState
              icon={search.trim() ? "search-outline" : "library-outline"}
              title={search.trim() ? "No matches" : "No topics"}
              body={
                search.trim()
                  ? "Try a different search or reset your filters."
                  : "No practice topics found for this scope."
              }
            />
          ) : (
            <View style={localStyles.list}>
              {topicsPager.items.map((topic) => {
                const avail = topicAvailability(topic, topicSession)
                return (
                  <FacultyPracticeListCard
                    key={topic.name}
                    thumb={facultyPracticeTopicThumb(topic.name)}
                    icon="library-outline"
                    title={topic.name}
                    subtitle={`${topic.question_count} questions · ${avail?.daily_limit ?? 10}/day`}
                    pills={
                      <FacultyStatusPill
                        label={avail?.is_available ? "Available" : "Hidden"}
                        tone={avail?.is_available ? "success" : "neutral"}
                      />
                    }
                    accessibilityLabel={`${topic.name}, ${avail?.is_available ? "Available" : "Hidden"}`}
                    onPress={() => setTopicQuestionsTopic(topic)}
                  />
                )
              })}
              <FacultyListPagerFooter pager={topicsPager} />
            </View>
          )
        ) : tab === "students" ? (
          filteredStudents.length === 0 ? (
            <FacultyEmptyState
              icon={search.trim() ? "search-outline" : "people-outline"}
              title={search.trim() ? "No matches" : "No student progress"}
              body={
                search.trim()
                  ? "Try a different search or reset your filters."
                  : "Student practice activity will appear here."
              }
            />
          ) : (
            <View style={localStyles.list}>
              {studentsPager.items.map((student) => {
                const name = practiceStudentName(student)
                const thumb = facultyPracticeStudentThumb(student.student_id)
                return (
                  <FacultyPracticeListCard
                    key={student.student_id}
                    thumb={thumb}
                    thumbChild={
                      <Text style={[localStyles.thumbInitials, { color: thumb.icon }]}>
                        {studentInitials(name)}
                      </Text>
                    }
                    title={name}
                    subtitle={`${practiceStudentAttempts(student)} attempt${
                      practiceStudentAttempts(student) === 1 ? "" : "s"
                    } · ${Math.round(practiceStudentScore(student))}% avg${
                      student.student_section ? ` · ${student.student_section}` : ""
                    }`}
                    meta={student.last_practiced ? `Last ${formatWhen(student.last_practiced)}` : undefined}
                    accessibilityLabel={`${name}, ${practiceStudentAttempts(student)} attempts, ${Math.round(practiceStudentScore(student))} percent average`}
                    onPress={() => setSelectedStudent(student)}
                  />
                )
              })}
              <FacultyListPagerFooter pager={studentsPager} />
            </View>
          )
        ) : tab === "analytics" ? (
          <AnalyticsTab topicPerformance={topicPerformance} dailyTrends={dailyTrends} />
        ) : (
          <>
            <ActivityTab activity={activityPager.items} />
            <FacultyListPagerFooter pager={activityPager} />
          </>
        )}
      </ScrollView>

      <FacultyFilterSheet
        visible={sessionFilterOpen}
        title="Topic scope"
        subtitle="Filter topics by section"
        options={[
          { value: "ALL", label: "All sections" },
          ...uniqueSessions.map((s) => ({ value: s.code, label: s.code })),
        ]}
        value={topicSession}
        onSelect={(v) => {
          setTopicSession(v)
          setSessionFilterOpen(false)
        }}
        onClose={() => setSessionFilterOpen(false)}
      />

      <FacultyFilterSheet
        visible={studentFilterOpen}
        title="Filter students"
        subtitle="Section or topic"
        options={[
          { value: "ALL", label: "All students" },
          ...uniqueSessions.map((s) => ({ value: `session:${s.code}`, label: `Section ${s.code}` })),
          ...topicNames.map((t) => ({ value: `topic:${t}`, label: t })),
        ]}
        value={
          studentTopic !== "ALL"
            ? `topic:${studentTopic}`
            : studentSession !== "ALL"
              ? `session:${studentSession}`
              : "ALL"
        }
        onSelect={(v) => {
          if (v.startsWith("session:")) {
            setStudentSession(v.replace("session:", ""))
            setStudentTopic("ALL")
          } else if (v.startsWith("topic:")) {
            setStudentTopic(v.replace("topic:", ""))
            setStudentSession("ALL")
          } else {
            setStudentSession("ALL")
            setStudentTopic("ALL")
          }
          setStudentFilterOpen(false)
        }}
        onClose={() => setStudentFilterOpen(false)}
      />

      <FacultyPracticeConfigureModal
        visible={configureOpen}
        scope={scope}
        sessions={uniqueSessions}
        selectedSession={topicSession}
        acting={acting}
        onClose={() => setConfigureOpen(false)}
        onSaved={() => void load()}
      />

      <FacultyPracticeTopicQuestionsModal
        visible={topicQuestionsTopic != null}
        scope={scope}
        topic={topicQuestionsTopic}
        session={topicSession}
        acting={acting}
        onClose={() => setTopicQuestionsTopic(null)}
        onOpenSettings={() => {
          if (topicQuestionsTopic) {
            const topic = topicQuestionsTopic
            setTopicQuestionsTopic(null)
            setTimeout(() => setSelectedTopic(topic), 280)
          }
        }}
        onChanged={() => void loadTopics()}
        onActingChange={setActing}
      />

      <FacultyPracticeTopicActionSheet
        visible={selectedTopic != null}
        topic={selectedTopic}
        session={topicSession}
        acting={acting}
        onClose={() => setSelectedTopic(null)}
        onManageQuestions={() => {
          if (selectedTopic) {
            const topic = selectedTopic
            setSelectedTopic(null)
            setTimeout(() => setTopicQuestionsTopic(topic), 280)
          }
        }}
        onToggle={(topic, enabled) =>
          runAction(() => {
            const avail = topicAvailability(topic, topicSession)
            return instructorApi.togglePracticeTopic(scope!, {
              topicName: topic.name,
              session: topicSession,
              isAvailable: enabled,
              dailyLimit: avail?.daily_limit ?? 10})
          })
        }
        onSaveLimit={(topic, dailyLimit) =>
          void runAction(() =>
            instructorApi.configurePracticeTopic(scope!, {
              topic: topic.name,
              session: topicSession,
              daily_limit: dailyLimit,
              is_available: topicAvailability(topic, topicSession)?.is_available ?? true}),
          )
        }
        onRemove={(topic) =>
          void runAction(async () => {
            await instructorApi.removePracticeTopic(scope!, topic.name, topicSession)
            setSelectedTopic(null)
          })
        }
      />

      <FacultyPracticeStudentActionSheet
        visible={selectedStudent != null}
        student={selectedStudent}
        acting={acting}
        onClose={() => setSelectedStudent(null)}
        onViewReport={() => {
          if (selectedStudent) openStudentReport(selectedStudent)
        }}
        onReset={() =>
          void runAction(async () => {
            if (!selectedStudent) return
            await instructorApi.resetPracticeStudent(scope!, selectedStudent.student_id)
            setSelectedStudent(null)
          })
        }
      />

      <FacultyPracticeStudentReportModal
        visible={reportStudent != null}
        scope={scope}
        student={reportStudent}
        onClose={() => setReportStudent(null)}
      />
    </View>
  )
}

function AnalyticsTab({
  topicPerformance,
  dailyTrends}: {
  topicPerformance: NonNullable<PracticeAnalytics["topicPerformance"]>
  dailyTrends: NonNullable<PracticeAnalytics["dailyTrends"]>
}) {
  const { tokens, native, type } = useModuleTheme()

  const hasData = topicPerformance.length > 0 || dailyTrends.length > 0
  if (!hasData) {
    return (
      <FacultyEmptyState
        icon="analytics-outline"
        title="No analytics yet"
        body="Analytics appear once students start practicing."
      />
    )
  }

  const topTopics = [...topicPerformance].sort((a, b) => b.attempts - a.attempts).slice(0, 5)
  const challenging = [...topicPerformance]
    .filter((t) => t.attempts >= 3)
    .sort((a, b) => topicScore(a) - topicScore(b))
    .slice(0, 3)
  const maxAttempts = Math.max(...topTopics.map((t) => t.attempts), 1)
  const maxTrend = Math.max(...dailyTrends.map((d) => d.attempts), 1)

  return (
    <View style={localStyles.sectionGap}>
      <Text style={[type.sectionHeader, localStyles.sectionTitle, { color: native.secondaryLabel }]}>Topic performance</Text>
      {topTopics.map((row) => (
        <View
          key={row.topic}
          style={[
            localStyles.analyticsCard,
            tokens.cardShadow,
            { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
          ]}
        >
          <View style={localStyles.barHead}>
            <Text style={[type.bodyEmphasis, localStyles.barLabel, { color: native.label }]} numberOfLines={2}>
              {row.topic}
            </Text>
            <Text style={[type.caption, localStyles.barValue, { color: native.secondaryLabel }]}>
              {row.attempts} attempts · {Math.round(topicScore(row))}%
            </Text>
          </View>
          <View style={[localStyles.barTrack, { backgroundColor: native.fill }]}>
            <View
              style={[
                localStyles.barFill,
                { width: `${(row.attempts / maxAttempts) * 100}%`, backgroundColor: FACULTY_PRACTICE_COLOR.analyticsBar },
              ]}
            />
          </View>
          {row.uniqueStudents != null ? (
            <Text style={[type.caption, localStyles.barHint, { color: native.tertiaryLabel }]}>
              {row.uniqueStudents} students
            </Text>
          ) : null}
        </View>
      ))}

      {dailyTrends.length > 0 ? (
        <>
          <Text style={[type.sectionHeader, localStyles.sectionTitle, { color: native.secondaryLabel }]}>14-day trend</Text>
          {dailyTrends.map((row) => (
            <View
              key={row.date}
              style={[
                localStyles.analyticsCard,
                tokens.cardShadow,
                { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
              ]}
            >
              <View style={localStyles.barHead}>
                <Text style={[type.bodyEmphasis, localStyles.barLabel, { color: native.label }]}>{row.date}</Text>
                <Text style={[type.caption, localStyles.barValue, { color: native.secondaryLabel }]}>
                  {row.attempts} · {Math.round(row.avgScore)}%
                </Text>
              </View>
              <View style={[localStyles.barTrack, { backgroundColor: native.fill }]}>
                <View
                  style={[
                    localStyles.barFill,
                    { width: `${(row.attempts / maxTrend) * 100}%`, backgroundColor: FACULTY_PRACTICE_COLOR.trendBar },
                  ]}
                />
              </View>
            </View>
          ))}
        </>
      ) : null}

      {challenging.length > 0 ? (
        <>
          <Text style={[type.sectionHeader, localStyles.sectionTitle, { color: native.secondaryLabel }]}>Needs attention</Text>
          {challenging.map((row) => (
            <FacultySheetNotice
              key={row.topic}
              message={`${row.topic} · ${Math.round(topicScore(row))}% avg · ${row.attempts} attempts`}
            />
          ))}
        </>
      ) : null}
    </View>
  )
}

function ActivityTab({ activity }: { activity: PracticeActivityItem[] }) {
  if (activity.length === 0) {
    return (
      <FacultyEmptyState icon="time-outline" title="No recent activity" body="Practice sessions will show up here." />
    )
  }

  return (
    <View style={localStyles.list}>
      {activity.map((item, index) => {
        const score = Math.round(item.score)
        const topicLine = (item.topics ?? []).join(" · ")
        return (
          <FacultyPracticeListCard
            key={`${item.student_name}-${item.timestamp}-${index}`}
            thumb={facultyPracticeActivityThumb(`${item.student_name}-${index}`)}
            icon="pulse-outline"
            title={item.student_name}
            subtitle={`${item.correctAnswers}/${item.totalQuestions} correct · ${formatWhen(item.timestamp)}`}
            meta={topicLine || undefined}
            pills={
              <FacultyStatusPill
                label={`${score}%`}
                tone={score >= 80 ? "success" : score >= 60 ? "warning" : "danger"}
              />
            }
          />
        )
      })}
    </View>
  )
}

const localStyles = StyleSheet.create({
  chooseCourseBtn: {
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 20,
    paddingVertical: 12},
  chooseCourseBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  loader: { marginTop: 48 },
  list: { gap: 12 },
  thumbInitials: { fontWeight: "700", fontSize: 11 },
  sectionGap: { gap: 12 },
  sectionTitle: { letterSpacing: 0.4 },
  analyticsCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  barHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  barLabel: { flex: 1, fontSize: 14 },
  barValue: { fontWeight: "700" },
  barTrack: { height: 8, borderRadius: NATIVE.sectionRadius, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: NATIVE.sectionRadius },
  barHint: { fontWeight: "600" },
})
