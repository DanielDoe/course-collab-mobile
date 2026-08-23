import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type ClassroomPointAssignment,
  type ClassroomPointRow,
  type ClassroomPointsSummaryRow,
  type InstructorSession,
  type PracticePointRow,
} from "../../lib/instructor-api"
import {
  assignmentKindLabel,
  classroomPointTitle,
  computeOverviewStats,
  filterAssignmentsBySearch,
  filterPointsBySearch,
  filterSummaryBySearch,
  formatClassroomDisplayText,
  formatClassroomPoints,
  type ClassroomPointsTab,
} from "../../lib/faculty-classroom-points-utils"
import { formatAssignmentDueLabel } from "../../lib/faculty-classroom-assignment-form"
import { shortenTaskTitle, isSolutionAssignment, resolveAssignmentQuestionConfig } from "../../lib/classroom-submission"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { semanticSoft } from "../../lib/themed-module-theme"
import {
  FACULTY_CLASSROOM_POINTS_COLOR,
  facultyClassroomAssignmentThumb,
  facultyClassroomAwardThumb,
  facultyClassroomLeaderboardThumb,
  facultyClassroomPracticeThumb,
  facultyClassroomSubmissionThumb,
} from "../../lib/faculty-classroom-points-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyStickyHeaderScrollLayout, FacultyModuleStickyHeader, FacultyModuleTabBar, FacultySearchToolbar } from "./faculty-module-shell"
import { FacultyClassroomPointsKpiGrid } from "./FacultyClassroomPointsKpiGrid"
import { FacultyClassroomPointDetailModal } from "./FacultyClassroomPointDetailModal"
import { FacultyClassroomPointAssignmentCreateModal } from "./FacultyClassroomPointAssignmentCreateModal"
import { FacultyClassroomPointAssignmentDetailModal } from "./FacultyClassroomPointAssignmentDetailModal"
import { FacultyClassroomPointsLeaderboard } from "./FacultyClassroomPointsLeaderboard"
import { FacultyClassroomStudentHistorySheet } from "./FacultyClassroomStudentHistorySheet"
import { FacultyManualAwardModal } from "./FacultyManualAwardModal"

const TABS: Array<{
  id: ClassroomPointsTab
  label: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { id: "overview", label: "Overview", icon: "grid-outline" },
  { id: "pending", label: "Pending", icon: "time-outline" },
  { id: "leaderboard", label: "Board", icon: "trophy-outline" },
  { id: "awards", label: "Awards", icon: "ribbon-outline" },
  { id: "assignments", label: "Tasks", icon: "document-text-outline" },
]

export function FacultyClassroomPointsScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()
  const { refreshFacultyData } = useFacultyShell()

  const [tab, setTab] = useState<ClassroomPointsTab>("overview")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [sessions, setSessions] = useState<InstructorSession[]>([])

  const [pending, setPending] = useState<ClassroomPointRow[]>([])
  const [practicePending, setPracticePending] = useState<PracticePointRow[]>([])
  const [approved, setApproved] = useState<ClassroomPointRow[]>([])
  const [summary, setSummary] = useState<ClassroomPointsSummaryRow[]>([])
  const [assignments, setAssignments] = useState<ClassroomPointAssignment[]>([])

  const [selected, setSelected] = useState<ClassroomPointRow | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<"review" | "award">("review")
  const [selectedStudent, setSelectedStudent] = useState<ClassroomPointsSummaryRow | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<ClassroomPointAssignment | null>(null)
  const [awardOpen, setAwardOpen] = useState(false)
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false)
  const [bulkActing, setBulkActing] = useState<string | null>(null)

  function openPointDetail(point: ClassroomPointRow, variant: "review" | "award" = "review") {
    setSelectedVariant(variant)
    setSelected(point)
  }

  const selectedStudentLive = useMemo(() => {
    if (!selectedStudent) return null
    return (
      summary.find(
        (row) => row.student_id === selectedStudent.student_id && row.session === selectedStudent.session,
      ) ?? selectedStudent
    )
  }, [selectedStudent, summary])

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    try {
      const [pendingRows, practiceRows, approvedRows, summaryRows, assignmentRows, sessionRes] =
        await Promise.all([
          instructorApi.getClassroomPoints(scope, { status: "pending", limit: 150 }),
          instructorApi.getPendingPracticePoints(scope),
          instructorApi.getClassroomPoints(scope, { status: "approved", limit: 80 }),
          instructorApi.getClassroomPointsSummary(scope),
          instructorApi.getClassroomPointAssignments(scope),
          instructorApi.getSessions(scope, scope.academicTermId ?? undefined),
        ])
      setPending(pendingRows)
      setPracticePending(practiceRows)
      setApproved(approvedRows)
      setSummary(summaryRows)
      setAssignments(assignmentRows)
      setSessions(
        (sessionRes.sessions ?? []).filter((s, i, arr) => {
          const code = s.code?.trim()
          if (!code) return false
          return arr.findIndex((x) => x.code?.trim() === code) === i
        }),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load classroom points.")
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([load(), refreshFacultyData?.(undefined, { force: true })])
    } finally {
      setRefreshing(false)
    }
  }, [load, refreshFacultyData])

  useNotificationModuleRefresh("classroom-points", handleRefresh)

  const stats = useMemo(
    () => computeOverviewStats({ pending, practicePending, summary, assignments }),
    [pending, practicePending, summary, assignments],
  )

  const pendingFiltered = useMemo(
    () => filterPointsBySearch(pending, search),
    [pending, search],
  )
  const approvedFiltered = useMemo(
    () => filterPointsBySearch(approved, search),
    [approved, search],
  )
  const assignmentsFiltered = useMemo(
    () => filterAssignmentsBySearch(assignments, search),
    [assignments, search],
  )
  const summaryFiltered = useMemo(
    () => filterSummaryBySearch(summary, search),
    [summary, search],
  )

  const toolbarTrailingAction = useMemo(() => {
    if (tab === "assignments") {
      return {
        onPress: () => setCreateAssignmentOpen(true),
        accessibilityLabel: "Create assignment",
      }
    }
    if (tab === "leaderboard") return undefined
    return {
      onPress: () => setAwardOpen(true),
      accessibilityLabel: "Award points",
    }
  }, [tab])

  async function runBulk(
    key: string,
    title: string,
    message: string,
    action: () => Promise<{ message?: string; count?: number }>,
  ) {
    if (!scope) return
    AppAlert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: () => {
          void (async () => {
            setBulkActing(key)
            try {
              const res = await action()
              AppAlert.alert("Done", res.message ?? `${res.count ?? 0} processed.`)
              await handleRefresh()
            } catch (err) {
              AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setBulkActing(null)
            }
          })()
        },
      },
    ])
  }

  if (!ready) {
    return (
      <View style={[moduleStyles.center, localStyles.center]}>
        <FacultyEmptyState
          icon="book-outline"
          title="Select a course"
          body="Classroom points are scoped to your active course."
        />
      </View>
    )
  }

  const pendingCount = stats.pendingReview + stats.practicePending

  const tabItems = TABS.map((t) => ({
    ...t,
    count: t.id === "pending" && pendingCount > 0 ? pendingCount : undefined,
  }))

  const searchPlaceholder =
    tab === "leaderboard"
      ? "Search students…"
      : tab === "assignments"
        ? "Search tasks…"
        : tab === "overview"
          ? "Search submissions or tasks…"
          : "Search submissions…"

  return (
    <View style={[moduleStyles.root, localStyles.root]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabItems} tab={tab} onChange={setTab} scrollable />

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          showFilter={false}
          trailingAction={toolbarTrailingAction}
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        contentContainerStyle={[localStyles.content, listScrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_CLASSROOM_POINTS_COLOR.link}
          />
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

        {loading ? (
          <View style={localStyles.loadingBox}>
            <ActivityIndicator color={FACULTY_CLASSROOM_POINTS_COLOR.link} />
          </View>
        ) : (
          <>
            {tab === "overview" ? (
              <OverviewPanel
                stats={stats}
                pending={pendingFiltered}
                practicePending={practicePending}
                assignments={assignmentsFiltered}
                summary={summaryFiltered}
                approved={approvedFiltered}
                search={search}
                onGoPending={() => setTab("pending")}
                onSelectPoint={(point) => openPointDetail(point, "review")}
                onSelectAward={(point) => openPointDetail(point, "award")}
                onGoAssignments={() => setTab("assignments")}
                onGoLeaderboard={() => setTab("leaderboard")}
                onGoAwards={() => setTab("awards")}
                onSelectStudent={setSelectedStudent}
              />
            ) : null}

            {tab === "pending" ? (
              <View style={localStyles.section}>
                {pendingCount > 0 ? (
                  <BulkActionsPanel
                    acting={bulkActing}
                    classroomCount={stats.pendingReview}
                    practiceCount={stats.practicePending}
                    onApproveAll={() =>
                      void runBulk(
                        "approve-all",
                        "Approve all submissions?",
                        "Keeps the highest score per student and assignment; rejects duplicates.",
                        () => instructorApi.approveAllClassroomPoints(scope!),
                      )
                    }
                    onVerifyApproveAll={() =>
                      void runBulk(
                        "verify-all",
                        "Verify & approve all?",
                        "Runs AI validation on each submission before approving. This may take a minute.",
                        () => instructorApi.verifyAndApproveAllClassroomPoints(scope!),
                      )
                    }
                    onApproveAllPractice={() =>
                      void runBulk(
                        "practice-all",
                        "Approve all practice points?",
                        "Approves every pending practice hub submission.",
                        () => instructorApi.approveAllPracticePoints(scope!),
                      )
                    }
                  />
                ) : null}

                {practicePending.length > 0 ? (
                  <>
                    <SectionHeader label="Practice hub" accent={FACULTY_CLASSROOM_POINTS_COLOR.practice} count={practicePending.length} />
                    {practicePending.map((point) => (
                      <PracticeCard
                        key={point.id}
                        point={point}
                        acting={bulkActing === `practice-${point.id}`}
                        onApprove={() =>
                          void (async () => {
                            setBulkActing(`practice-${point.id}`)
                            try {
                              await instructorApi.approvePracticePoint(scope!, point.id)
                              await handleRefresh()
                            } catch (err) {
                              AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Try again.")
                            } finally {
                              setBulkActing(null)
                            }
                          })()
                        }
                        onReject={() =>
                          AppAlert.alert("Reject practice point?", undefined, [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Reject",
                              style: "destructive",
                              onPress: () => {
                                void (async () => {
                                  setBulkActing(`practice-${point.id}`)
                                  try {
                                    await instructorApi.rejectPracticePoint(scope!, point.id)
                                    await handleRefresh()
                                  } catch (err) {
                                    AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Try again.")
                                  } finally {
                                    setBulkActing(null)
                                  }
                                })()
                              },
                            },
                          ])
                        }
                      />
                    ))}
                  </>
                ) : null}

                {pendingFiltered.length > 0 ? (
                  <>
                    <SectionHeader label="Code & solution" accent={FACULTY_CLASSROOM_POINTS_COLOR.code} count={stats.pendingReview} />
                    {pendingFiltered.map((point) => (
                      <PendingCard key={point.id} point={point} onPress={() => openPointDetail(point, "review")} />
                    ))}
                  </>
                ) : practicePending.length === 0 ? (
                  <FacultyEmptyState
                    icon="checkmark-circle-outline"
                    title="Nothing pending"
                    body="Student submissions awaiting review appear here."
                  />
                ) : null}
              </View>
            ) : null}

            {tab === "leaderboard" ? (
              <FacultyClassroomPointsLeaderboard
                loading={false}
                rows={summary}
                search={search}
                onSelectStudent={setSelectedStudent}
              />
            ) : null}

            {tab === "awards" ? (
              <View style={localStyles.section}>
                {approvedFiltered.length === 0 ? (
                  <FacultyEmptyState
                    icon="ribbon-outline"
                    title="No recent awards"
                    body="Approved points and manual awards show up here."
                  />
                ) : (
                  approvedFiltered.map((point) => (
                    <AwardCard key={point.id} point={point} onPress={() => openPointDetail(point, "award")} />
                  ))
                )}
              </View>
            ) : null}

            {tab === "assignments" ? (
              <View style={localStyles.section}>
                {assignments.length === 0 ? (
                  <FacultyEmptyState
                    icon="document-text-outline"
                    title="No assignments"
                    body="Use + in the search bar to create a code or solution task for students to submit."
                  />
                ) : assignmentsFiltered.length === 0 ? (
                  <FacultyEmptyState
                    icon="search-outline"
                    title="No matching tasks"
                    body="Try another search term."
                  />
                ) : (
                  assignmentsFiltered.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onOpen={() => setSelectedAssignment(assignment)}
                    />
                  ))
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <FacultyClassroomStudentHistorySheet
        student={selectedStudentLive}
        scope={scope}
        onClose={() => setSelectedStudent(null)}
        onSelectPoint={openPointDetail}
      />

      <FacultyClassroomPointDetailModal
        point={selected}
        scope={scope}
        variant={selectedVariant}
        onClose={() => setSelected(null)}
        onUpdated={() => void handleRefresh()}
      />

      <FacultyManualAwardModal
        visible={awardOpen}
        scope={scope}
        onClose={() => setAwardOpen(false)}
        onAwarded={() => void handleRefresh()}
      />

      <FacultyClassroomPointAssignmentCreateModal
        visible={createAssignmentOpen}
        scope={scope}
        sessions={sessions}
        onClose={() => setCreateAssignmentOpen(false)}
        onCreated={() => void handleRefresh()}
      />

      <FacultyClassroomPointAssignmentDetailModal
        assignment={selectedAssignment}
        scope={scope}
        sessions={sessions}
        onClose={() => setSelectedAssignment(null)}
        onUpdated={() => void handleRefresh()}
      />
    </View>
  )
}

function SectionHeader({ label, accent, count }: { label: string; accent: string; count?: number }) {
  const { native, type } = useModuleTheme()
  return (
    <View style={localStyles.sectionHead}>
      <View style={[localStyles.sectionDot, { backgroundColor: accent }]} />
      <Text style={[type.sectionHeader, { color: native.label, textTransform: "none" }]}>
        {label}
        {count != null ? ` (${count})` : ""}
      </Text>
    </View>
  )
}

function BulkActionsPanel({
  acting,
  classroomCount,
  practiceCount,
  onApproveAll,
  onVerifyApproveAll,
  onApproveAllPractice,
}: {
  acting: string | null
  classroomCount: number
  practiceCount: number
  onApproveAll: () => void
  onVerifyApproveAll: () => void
  onApproveAllPractice: () => void
}) {
  const { native, tokens, type } = useModuleTheme()

  return (
    <View
      style={[
        localStyles.bulkPanel,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
      ]}
    >
      <SectionHeader label="Bulk actions" accent={FACULTY_CLASSROOM_POINTS_COLOR.action} />
      {classroomCount > 0 ? (
        <>
          <BulkBtn
            label={acting === "approve-all" ? "Working…" : `Approve all (${classroomCount})`}
            icon="checkmark-done-outline"
            tone="primary"
            disabled={Boolean(acting)}
            onPress={onApproveAll}
          />
          <BulkBtn
            label={acting === "verify-all" ? "Verifying…" : "Verify & approve all"}
            icon="sparkles-outline"
            tone="ai"
            disabled={Boolean(acting)}
            onPress={onVerifyApproveAll}
          />
        </>
      ) : null}
      {practiceCount > 0 ? (
        <BulkBtn
          label={acting === "practice-all" ? "Working…" : `Approve all practice (${practiceCount})`}
          icon="fitness-outline"
          tone="secondary"
          disabled={Boolean(acting)}
          onPress={onApproveAllPractice}
        />
      ) : null}
    </View>
  )
}

function BulkBtn({
  label,
  icon,
  tone,
  disabled,
  onPress,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  tone: "primary" | "secondary" | "ai"
  disabled?: boolean
  onPress: () => void
}) {
  const { native, tokens, type } = useModuleTheme()
  const primary = tone === "primary"
  const ai = tone === "ai"
  const accent = ai ? FACULTY_CLASSROOM_POINTS_COLOR.ai : FACULTY_CLASSROOM_POINTS_COLOR.link

  return (
    <Pressable
      style={[
        localStyles.bulkBtn,
        {
          backgroundColor: primary
            ? FACULTY_CLASSROOM_POINTS_COLOR.action
            : semanticSoft(accent, tokens.isDark),
          borderColor: primary ? FACULTY_CLASSROOM_POINTS_COLOR.action : `${accent}44`,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={primary ? "#ffffff" : accent} />
      <Text
        style={[
          type.caption,
          { fontWeight: "600", color: primary ? "#ffffff" : ai ? accent : native.label },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function OverviewSectionLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { type } = useModuleTheme()
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={[type.caption, { color: FACULTY_CLASSROOM_POINTS_COLOR.link, fontWeight: "700" }]}>{label}</Text>
    </Pressable>
  )
}

function OverviewPanel({
  stats,
  pending,
  practicePending,
  assignments,
  summary,
  approved,
  search,
  onGoPending,
  onSelectPoint,
  onSelectAward,
  onGoAssignments,
  onGoLeaderboard,
  onGoAwards,
  onSelectStudent,
}: {
  stats: ReturnType<typeof computeOverviewStats>
  pending: ClassroomPointRow[]
  practicePending: PracticePointRow[]
  assignments: ClassroomPointAssignment[]
  summary: ClassroomPointsSummaryRow[]
  approved: ClassroomPointRow[]
  search: string
  onGoPending: () => void
  onSelectPoint: (point: ClassroomPointRow) => void
  onSelectAward: (point: ClassroomPointRow) => void
  onGoAssignments: () => void
  onGoLeaderboard: () => void
  onGoAwards: () => void
  onSelectStudent: (row: ClassroomPointsSummaryRow) => void
}) {
  const { native, tokens, type } = useModuleTheme()
  const topPending = pending.filter((p) => !p.isDuplicate).slice(0, 3)
  const active = assignments.filter((a) => a.is_active !== false).slice(0, 3)
  const topStudents = [...summary]
    .sort((a, b) => Number(b.total_points) - Number(a.total_points))
    .slice(0, 5)
  const recentAwards = approved.slice(0, 5)
  const reviewItems: Array<
    | { kind: "classroom"; point: ClassroomPointRow }
    | { kind: "practice"; point: PracticePointRow }
  > = [
    ...topPending.map((point) => ({ kind: "classroom" as const, point })),
    ...practicePending.slice(0, 2).map((point) => ({ kind: "practice" as const, point })),
  ]

  const hasSearch = Boolean(search.trim())
  const hasAnyData =
    summary.length > 0 ||
    approved.length > 0 ||
    assignments.length > 0 ||
    pending.length > 0 ||
    practicePending.length > 0
  const hasVisibleContent =
    reviewItems.length > 0 || active.length > 0 || topStudents.length > 0 || recentAwards.length > 0

  return (
    <View style={localStyles.section}>
      <FacultyClassroomPointsKpiGrid stats={stats} />

      {reviewItems.length > 0 ? (
        <Pressable
          style={[
            localStyles.queueBanner,
            {
              backgroundColor: semanticSoft(FACULTY_CLASSROOM_POINTS_COLOR.queue, tokens.isDark),
              borderColor: `${FACULTY_CLASSROOM_POINTS_COLOR.queue}44`,
            },
          ]}
          onPress={onGoPending}
        >
          <View style={[localStyles.queueBannerIcon, { backgroundColor: FACULTY_CLASSROOM_POINTS_COLOR.queue }]}>
            <Ionicons name="time-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={localStyles.queueBannerCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>
              {pending.filter((p) => !p.isDuplicate).length + practicePending.length} items need review
            </Text>
            <Text style={[type.caption, { color: FACULTY_CLASSROOM_POINTS_COLOR.pending, fontWeight: "700" }]}>
              Approve all · Verify with AI · Review one-by-one
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={FACULTY_CLASSROOM_POINTS_COLOR.link} />
        </Pressable>
      ) : null}

      {reviewItems.length > 0 ? (
        <View style={localStyles.overviewBlock}>
          <View style={localStyles.overviewBlockHead}>
            <SectionHeader label="Next to review" accent={FACULTY_CLASSROOM_POINTS_COLOR.pending} />
            <OverviewSectionLink label="View all" onPress={onGoPending} />
          </View>
          {reviewItems.map((item) => {
            if (item.kind === "classroom") {
              const point = item.point
              return (
                <FacultySignatureListCard
                  key={point.id}
                  thumb={facultyClassroomSubmissionThumb(point.category, point.id)}
                  icon={point.category === "solution_submission" ? "create-outline" : "code-slash-outline"}
                  title={shortenTaskTitle(classroomPointTitle(point))}
                  eyebrow={point.student_name ?? "Student"}
                  metaLine={[point.session, formatFacultyRelativeTime(point.created_at)].filter(Boolean).join(" · ")}
                  accentLine={{ text: `${formatClassroomPoints(point.points)} pts`, color: FACULTY_CLASSROOM_POINTS_COLOR.points }}
                  status={{ label: "Pending", color: FACULTY_CLASSROOM_POINTS_COLOR.pending, icon: "time-outline" }}
                  onPress={() => onSelectPoint(point)}
                />
              )
            }
            const point = item.point
            return (
              <FacultySignatureListCard
                key={`p-${point.id}`}
                thumb={facultyClassroomPracticeThumb(point.id)}
                icon="fitness-outline"
                title={shortenTaskTitle(point.reason || point.practice_problem || "Practice submission")}
                eyebrow={point.student_name ?? "Student"}
                metaLine={[point.session, formatFacultyRelativeTime(point.created_at)].filter(Boolean).join(" · ")}
                accentLine={{ text: `${formatClassroomPoints(point.points)} pts`, color: FACULTY_CLASSROOM_POINTS_COLOR.points }}
                status={{ label: "Practice", color: FACULTY_CLASSROOM_POINTS_COLOR.practice, icon: "fitness-outline" }}
                onPress={onGoPending}
              />
            )
          })}
        </View>
      ) : null}

      {active.length > 0 ? (
        <View style={localStyles.overviewBlock}>
          <View style={localStyles.overviewBlockHead}>
            <SectionHeader label="Open assignments" accent={FACULTY_CLASSROOM_POINTS_COLOR.assignment} />
            <OverviewSectionLink label="View all" onPress={onGoAssignments} />
          </View>
          {active.map((assignment) => (
            <FacultySignatureListCard
              key={assignment.id}
              thumb={facultyClassroomAssignmentThumb(assignment.id)}
              icon={assignment.submission_kind === "solution" ? "create-outline" : "code-slash-outline"}
              title={shortenTaskTitle(formatClassroomDisplayText(assignment.title))}
              metaLine={[assignmentKindLabel(assignment.submission_kind), assignment.session].filter(Boolean).join(" · ")}
              status={{ label: "Open", color: FACULTY_CLASSROOM_POINTS_COLOR.approved, icon: "checkmark-circle-outline" }}
              onPress={onGoAssignments}
            />
          ))}
        </View>
      ) : null}

      {topStudents.length > 0 ? (
        <View style={localStyles.overviewBlock}>
          <View style={localStyles.overviewBlockHead}>
            <SectionHeader label="Top students" accent={FACULTY_CLASSROOM_POINTS_COLOR.leaderboard} />
            <OverviewSectionLink label="View board" onPress={onGoLeaderboard} />
          </View>
          {topStudents.map((row, index) => (
            <FacultySignatureListCard
              key={`${row.student_id}-${row.session}`}
              thumb={facultyClassroomLeaderboardThumb(`${row.student_id}-${row.session}`)}
              icon={index === 0 ? "trophy-outline" : "person-outline"}
              title={row.full_name}
              eyebrow={[row.student_number, row.session].filter(Boolean).join(" · ")}
              accentLine={{
                text: `${formatClassroomPoints(row.total_points)} pts`,
                color: FACULTY_CLASSROOM_POINTS_COLOR.points,
              }}
              status={{
                label: `#${index + 1}`,
                color: index === 0 ? FACULTY_CLASSROOM_POINTS_COLOR.points : FACULTY_CLASSROOM_POINTS_COLOR.leaderboard,
                icon: index === 0 ? "trophy-outline" : "ellipse",
              }}
              onPress={() => onSelectStudent(row)}
            />
          ))}
        </View>
      ) : null}

      {recentAwards.length > 0 ? (
        <View style={localStyles.overviewBlock}>
          <View style={localStyles.overviewBlockHead}>
            <SectionHeader label="Recent awards" accent={FACULTY_CLASSROOM_POINTS_COLOR.award} />
            <OverviewSectionLink label="View all" onPress={onGoAwards} />
          </View>
          {recentAwards.map((point) => (
            <FacultySignatureListCard
              key={point.id}
              thumb={facultyClassroomAwardThumb(point.id)}
              icon="ribbon-outline"
              title={shortenTaskTitle(classroomPointTitle(point))}
              eyebrow={point.student_name ?? "Student"}
              metaLine={formatFacultyRelativeTime(point.awarded_at ?? point.created_at)}
              accentLine={{ text: `+${formatClassroomPoints(point.points)}`, color: FACULTY_CLASSROOM_POINTS_COLOR.points }}
              status={{ label: "Approved", color: FACULTY_CLASSROOM_POINTS_COLOR.approved, icon: "checkmark-circle-outline" }}
              onPress={() => onSelectAward(point)}
            />
          ))}
        </View>
      ) : null}

      {!hasVisibleContent && hasSearch ? (
        <FacultyEmptyState
          icon="search-outline"
          title="No matching results"
          body="Try another search term or clear the search bar."
        />
      ) : !hasVisibleContent && !hasAnyData ? (
        <FacultyEmptyState
          icon="ribbon-outline"
          title="All caught up"
          body="No pending submissions or open tasks. Use Pending to review new work, Tasks to create assignments, or Board for standings."
        />
      ) : null}
    </View>
  )
}

function PendingCard({ point, onPress }: { point: ClassroomPointRow; onPress: () => void }) {
  const duplicate = Boolean(point.isDuplicate)

  return (
    <FacultySignatureListCard
      thumb={facultyClassroomSubmissionThumb(point.category, point.id)}
      icon={point.category === "solution_submission" ? "create-outline" : "code-slash-outline"}
      title={classroomPointTitle(point)}
      eyebrow={point.student_name ?? "Student"}
      metaLine={formatFacultyRelativeTime(point.created_at)}
      accentLine={{
        text: formatClassroomPoints(point.points),
        color: FACULTY_CLASSROOM_POINTS_COLOR.points,
      }}
      status={
        duplicate
          ? { label: "Duplicate", color: FACULTY_CLASSROOM_POINTS_COLOR.rejected, icon: "alert-circle-outline" }
          : { label: "Pending", color: FACULTY_CLASSROOM_POINTS_COLOR.pending, icon: "time-outline" }
      }
      onPress={onPress}
    />
  )
}

function PracticeCard({
  point,
  acting,
  onApprove,
  onReject,
}: {
  point: PracticePointRow
  acting: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const { tokens, type } = useModuleTheme()

  return (
    <FacultySignatureListCard
      thumb={facultyClassroomPracticeThumb(point.id)}
      icon="fitness-outline"
      title={point.reason || point.practice_problem || "Practice submission"}
      eyebrow={point.student_name ?? "Student"}
      metaLine={formatFacultyRelativeTime(point.created_at)}
      accentLine={{
        text: formatClassroomPoints(point.points),
        color: FACULTY_CLASSROOM_POINTS_COLOR.points,
      }}
      status={{
        label: "Practice",
        color: FACULTY_CLASSROOM_POINTS_COLOR.practice,
        icon: "fitness-outline",
      }}
      footer={
        <View style={localStyles.inlineActions}>
          <Pressable
            style={[
              localStyles.inlineBtn,
              {
                backgroundColor: semanticSoft(tokens.danger, tokens.isDark),
                borderColor: `${tokens.danger}33`,
              },
            ]}
            onPress={onReject}
            disabled={acting}
          >
            <Text style={[type.caption, { color: tokens.danger, fontWeight: "600" }]}>Reject</Text>
          </Pressable>
          <Pressable
            style={[
              localStyles.inlineBtn,
              {
                backgroundColor: FACULTY_CLASSROOM_POINTS_COLOR.action,
                borderColor: FACULTY_CLASSROOM_POINTS_COLOR.action,
              },
            ]}
            onPress={onApprove}
            disabled={acting}
          >
            <Text style={[type.caption, { color: FACULTY_CLASSROOM_POINTS_COLOR.actionInk, fontWeight: "600" }]}>
              {acting ? "…" : "Approve"}
            </Text>
          </Pressable>
        </View>
      }
    />
  )
}

function AwardCard({ point, onPress }: { point: ClassroomPointRow; onPress: () => void }) {
  return (
    <FacultySignatureListCard
      thumb={facultyClassroomAwardThumb(point.id)}
      icon="ribbon-outline"
      title={classroomPointTitle(point)}
      eyebrow={point.student_name ?? "Student"}
      metaLine={formatFacultyRelativeTime(point.awarded_at ?? point.created_at)}
      accentLine={{
        text: `+${formatClassroomPoints(point.points)}`,
        color: FACULTY_CLASSROOM_POINTS_COLOR.points,
      }}
      status={{ label: "Approved", color: FACULTY_CLASSROOM_POINTS_COLOR.approved, icon: "checkmark-circle-outline" }}
      onPress={onPress}
    />
  )
}

function AssignmentCard({
  assignment,
  onOpen,
}: {
  assignment: ClassroomPointAssignment
  onOpen: () => void
}) {
  const active = assignment.is_active !== false
  const isSolution = isSolutionAssignment(assignment)
  const questionConfig = resolveAssignmentQuestionConfig(assignment)
  const problemPreview = questionConfig?.question_text?.trim()
  const dueLabel = formatAssignmentDueLabel(assignment.due_at ?? assignment.expires_at)

  const description = isSolution
    ? problemPreview
      ? formatClassroomDisplayText(problemPreview)
      : "No problem statement yet."
    : assignment.description
      ? formatClassroomDisplayText(assignment.description)
      : undefined

  const metaParts = [
    assignmentKindLabel(assignment.submission_kind),
    assignment.session ?? "All sections",
    dueLabel !== "No due date" ? `Due ${dueLabel}` : null,
  ].filter(Boolean)

  return (
    <FacultySignatureListCard
      thumb={facultyClassroomAssignmentThumb(assignment.id)}
      icon={isSolution ? "create-outline" : "code-slash-outline"}
      title={formatClassroomDisplayText(assignment.title)}
      description={description}
      metaLine={metaParts.join(" · ")}
      status={{
        label: active ? "Open" : "Expired",
        color: active ? FACULTY_CLASSROOM_POINTS_COLOR.approved : FACULTY_CLASSROOM_POINTS_COLOR.pending,
        icon: active ? "checkmark-circle-outline" : "time-outline",
      }}
      onPress={onOpen}
    />
  )
}

const localStyles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  section: { gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  overviewBlock: { gap: 10 },
  overviewBlockHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  queueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  queueBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  queueBannerCopy: { flex: 1, gap: 4 },
  loadingBox: { paddingVertical: 32, alignItems: "center" },
  bulkPanel: { gap: 8, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 11,
    borderWidth: 1,
  },
  inlineActions: { flexDirection: "row", gap: 8 },
  inlineBtn: {
    flex: 1,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 1,
  },
})
