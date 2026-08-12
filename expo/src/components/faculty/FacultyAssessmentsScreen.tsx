import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  ASSESSMENT_TYPE_CONFIG,
  filterAssessments,
  type AssessmentModuleSegment,
  type AssessmentStatusFilter,
  type AssessmentType} from "../../lib/faculty-assessment-utils"
import { instructorApi, type InstructorQuiz, type InstructorSession } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { consumeFacultyCoraPending } from "../../lib/faculty-cora-pending"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyAssessmentCard } from "./FacultyAssessmentCard"
import { FacultyAssessmentCreateModal } from "./FacultyAssessmentCreateModal"
import { FacultyAssessmentDetailModal } from "./FacultyAssessmentDetailModal"
import { FacultyAssessmentEditorModal } from "./FacultyAssessmentEditorModal"
import { FacultyAssessmentPreviewModal } from "./FacultyAssessmentPreviewModal"
import { FacultyDeletedAssessmentsScreen } from "./FacultyDeletedAssessmentsScreen"
import { FacultyIssuesScreen } from "./FacultyIssuesScreen"
import {
  FACULTY_ASSESSMENT_COLOR,
} from "../../lib/faculty-assessment-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { useFacultyStickyHeaderScrollLayout,
  FacultyAdaptiveSegmentNav,
  FacultyGroupedFilterSheet,
  FacultyModuleStickyHeader,
  FacultySearchToolbar,
  sectionFilterSheetOptions,
  resolveSessionFilterCode} from "./faculty-module-shell"

export function FacultyAssessmentsScreen({assessmentType,
  initialSegment = "manage"}: {
  assessmentType: string
  initialSegment?: AssessmentModuleSegment
}) {
  const { styles: moduleStyles, native, tokens, type: themeType } = useModuleTheme()
  const type = (assessmentType in ASSESSMENT_TYPE_CONFIG ? assessmentType : "quiz") as AssessmentType
  const config = ASSESSMENT_TYPE_CONFIG[type]
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [quizzes, setQuizzes] = useState<InstructorQuiz[]>([])
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [selected, setSelected] = useState<InstructorQuiz | null>(null)
  const [previewQuiz, setPreviewQuiz] = useState<InstructorQuiz | null>(null)
  const [editQuiz, setEditQuiz] = useState<InstructorQuiz | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createInitialTitle, setCreateInitialTitle] = useState<string | undefined>()
  const [createInitialDescription, setCreateInitialDescription] = useState<string | undefined>()

  const [search, setSearch] = useState("")
  const [sectionFilter, setSectionFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState<AssessmentStatusFilter>("ALL")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [segment, setSegment] = useState<AssessmentModuleSegment>(initialSegment)
  const [openIssueCount, setOpenIssueCount] = useState(0)
  const [deletedCount, setDeletedCount] = useState(0)

  useEffect(() => {
    setSegment(initialSegment)
  }, [initialSegment, type])

  useEffect(() => {
    if (!ready || !scope?.courseId) return
    void consumeFacultyCoraPending(scope.instructorId, scope.courseId, "quiz_create").then((pending) => {
      if (pending?.kind === "quiz_create") {
        setCreateInitialTitle(pending.title)
        setCreateInitialDescription(pending.description)
        setCreateOpen(true)
      }
    })
  }, [ready, scope?.courseId, scope?.instructorId])

  const load = useCallback(async () => {
    if (!scope) return
    const [items, sessionData, openIssues, deletedItems] = await Promise.all([
      instructorApi.getQuizzes(scope, type),
      instructorApi.getSessions(scope),
      instructorApi.getIssues(scope, "open", type),
      instructorApi.getDeletedAssessments(scope, type),
    ])
    setQuizzes(items)
    setSessions(sessionData.sessions ?? [])
    setOpenIssueCount(openIssues.length)
    setDeletedCount(deletedItems.length)
  }, [scope, type])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [ready, load])

  useEffect(() => {
    if (!selected) return
    const fresh = quizzes.find((q) => q.id === selected.id)
    if (fresh) setSelected(fresh)
    else setSelected(null)
  }, [quizzes, selected?.id])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh(["assessments", "issues"], handleRefresh)

  async function toggleSession(quizId: number, sessionCode: string, next: boolean) {
    if (!scope) return
    const key = `${quizId}:${sessionCode}`
    setTogglingKey(key)
    try {
      await instructorApi.toggleQuizSession(scope, quizId, sessionCode, next)
      await load()
    } catch (err) {
      AppAlert.alert("Could not update access", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setTogglingKey(null)
    }
  }

  const filtered = useMemo(() => {
    const sectionCode = resolveSessionFilterCode(sessions, sectionFilter) ?? "ALL"
    const items = filterAssessments(quizzes, sessions, statusFilter, sectionCode, search)
    return [...items].sort((a, b) => Number(b.is_active) - Number(a.is_active))
  }, [quizzes, sessions, statusFilter, sectionFilter, search])

  const filtersActive = sectionFilter !== "ALL" || statusFilter !== "ALL"

  function handleFilterSelect(groupId: string, value: string) {
    if (groupId === "status") setStatusFilter(value as AssessmentStatusFilter)
    if (groupId === "section") setSectionFilter(value)
  }

  function openEdit(quiz: InstructorQuiz) {
    setEditQuiz(quiz)
  }

  function performDelete(quiz: InstructorQuiz) {
    void (async () => {
      if (!scope) return
      try {
        await instructorApi.deleteQuiz(scope, quiz.id)
        if (selected?.id === quiz.id) setSelected(null)
        if (previewQuiz?.id === quiz.id) setPreviewQuiz(null)
        if (editQuiz?.id === quiz.id) setEditQuiz(null)
        await load()
      } catch (err) {
        AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
      }
    })()
  }

  async function handleCreated(quizId: number) {
    await load()
    if (!scope) return
    try {
      const detail = await instructorApi.getQuiz(scope, quizId)
      setEditQuiz(detail)
    } catch {
      setEditQuiz({ id: quizId, title: "New assessment", is_active: true })
    }
  }

  if (!ready) {
    return (
      <View style={[moduleStyles.center, styles.center]}>
        <FacultyEmptyState
          icon={config.icon}
          title="Select a course"
          body={`Choose a course to manage ${config.label.toLowerCase()}.`}
        />
      </View>
    )
  }

  return (
    <View style={[moduleStyles.root, styles.shell]}>
      <FacultyModuleStickyHeader>
        <FacultyAdaptiveSegmentNav
          tab={segment}
          onChange={setSegment}
          tabs={[
            { id: "manage" as const, label: `All ${config.label.toLowerCase()}`, icon: config.icon },
            { id: "issues" as const, label: "Issues", icon: "alert-circle-outline", count: openIssueCount },
            { id: "deleted" as const, label: "Deleted", icon: "trash-outline", count: deletedCount },
          ]}
        />
      </FacultyModuleStickyHeader>

      {segment === "issues" ? (
        <FacultyIssuesScreen assessmentType={type} onCountsChange={setOpenIssueCount} />
      ) : segment === "deleted" ? (
        <FacultyDeletedAssessmentsScreen assessmentType={type} onCountsChange={setDeletedCount} />
      ) : (
        <>
          <ScrollView
            style={[moduleStyles.root, styles.root]}
            contentContainerStyle={[styles.content, listScrollPad]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_ASSESSMENT_COLOR.link} />
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={`Search ${config.label.toLowerCase()}…`}
          filterActive={filtersActive}
          onOpenFilter={() => setFilterSheetOpen(true)}
          trailingAction={{
            onPress: () => setCreateOpen(true),
            accessibilityLabel: `Create ${config.shortLabel.toLowerCase()}`}}
        />

        <FacultyGroupedFilterSheet
          visible={filterSheetOpen}
          title="Filters"
          subtitle="Narrow by status or section."
          groups={[
            {
              id: "status",
              title: "Status",
              value: statusFilter,
              options: [
                { value: "ALL", label: "All" },
                { value: "live", label: "Live" },
                { value: "closed", label: "Closed" },
              ]},
            {
              id: "section",
              title: "Section",
              value: sectionFilter,
              options: sectionFilterSheetOptions(sessions)},
          ]}
          onSelect={handleFilterSelect}
          onClose={() => setFilterSheetOpen(false)}
        />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={FACULTY_ASSESSMENT_COLOR.link} size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <FacultyEmptyState
            icon={config.icon}
            title={quizzes.length === 0 ? `No ${config.label.toLowerCase()} yet` : "No matches"}
            body={
              quizzes.length === 0
                ? `Use + in the search bar to create your first ${config.label.toLowerCase().slice(0, -1)} from the question bank.`
                : "Try another filter or search term."
            }
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((quiz) => (
              <FacultyAssessmentCard
                key={quiz.id}
                quiz={quiz}
                sessions={sessions}
                togglingKey={togglingKey}
                onToggleSession={(id, code, next) => void toggleSession(id, code, next)}
                onOpen={() => setSelected(quiz)}
                onPreview={() => setPreviewQuiz(quiz)}
                onEdit={() => openEdit(quiz)}
                onDelete={() => performDelete(quiz)}
              />
            ))}
          </View>
        )}
          </ScrollView>

          <FacultyAssessmentCreateModal
            visible={createOpen}
            assessmentType={type}
            scope={scope}
            initialTitle={createInitialTitle}
            initialDescription={createInitialDescription}
            onClose={() => {
              setCreateOpen(false)
              setCreateInitialTitle(undefined)
              setCreateInitialDescription(undefined)
            }}
            onCreated={(quizId) => void handleCreated(quizId)}
          />

          <FacultyAssessmentDetailModal
        quiz={selected}
        assessmentType={type}
        scope={scope}
        sessions={sessions}
        togglingKey={togglingKey}
        onClose={() => setSelected(null)}
        onUpdated={() => void load()}
        onEdit={() => {
          setEditQuiz(selected)
          setSelected(null)
        }}
        onToggleSession={(id, code, next) => void toggleSession(id, code, next)}
      />

      <FacultyAssessmentEditorModal
        quiz={editQuiz}
        assessmentType={type}
        scope={scope}
        onClose={() => setEditQuiz(null)}
        onSaved={() => void load()}
      />

      <FacultyAssessmentPreviewModal
        quiz={previewQuiz}
        assessmentType={type}
        scope={scope}
        onClose={() => setPreviewQuiz(null)}
      />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1},
  root: { flex: 1},
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", padding: 24},
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  list: { gap: 12 }})
