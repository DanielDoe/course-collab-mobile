import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { hasActiveQuestionMedia } from "../../lib/classroom-submission"
import {
  DIFFICULTY_OPTIONS,
  filterBankQuestions,
  groupQuestionsByType,
  parseBankQuestionMedia,
  parseBankOptions,
  questionBankTypeLabel,
  stripQuestionPreview,
  type QuestionBankTab} from "../../lib/faculty-question-bank-utils"
import {
  instructorApi,
  type InstructorBankQuestion,
  type InstructorBankTopic} from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultyQuestionBankPreviewModal } from "./FacultyQuestionBankPreviewModal"
import { FacultyQuestionBankEditorModal } from "./FacultyQuestionBankEditorModal"
import { FacultyQuestionBankCreateWizard } from "./question-bank/FacultyQuestionBankCreateWizard"
import { FacultyCoraQuestionBankDraftModal } from "./cora/FacultyCoraQuestionBankDraftModal"
import { consumeFacultyCoraPending } from "../../lib/faculty-cora-pending"
import type { DraftQuestionBankItem } from "../../lib/question-bank-ai-types"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FACULTY_QUESTION_BANK_COLOR,
  facultyQuestionBankQuestionThumb,
  facultyQuestionBankTopicThumb,
  facultyQuestionBankTypeThumb,
} from "../../lib/faculty-question-bank-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { useFacultyStickyHeaderScrollLayout,
  FacultyGroupedFilterSheet,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar} from "./faculty-module-shell"
import { ModuleFlashList } from "../ModuleFlashList"

const TABS: Array<{ id: QuestionBankTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "all", label: "All", icon: "library-outline" },
  { id: "topics", label: "Topics", icon: "bookmark-outline" },
  { id: "types", label: "Types", icon: "grid-outline" },
  { id: "deleted", label: "Deleted", icon: "trash-outline" },
]

export function FacultyQuestionBankScreen() {
  const { styles: moduleStyles, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<QuestionBankTab>("all")
  const [questions, setQuestions] = useState<InstructorBankQuestion[]>([])
  const [topics, setTopics] = useState<InstructorBankTopic[]>([])
  const [deleted, setDeleted] = useState<InstructorBankQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [actingId, setActingId] = useState<number | null>(null)

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [difficultyFilter, setDifficultyFilter] = useState("ALL")
  const [topicFilter, setTopicFilter] = useState<string | null>(null)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const [selected, setSelected] = useState<InstructorBankQuestion | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorQuestionId, setEditorQuestionId] = useState<number | null>(null)
  const [editorCreateMode, setEditorCreateMode] = useState(false)
  const [createWizardOpen, setCreateWizardOpen] = useState(false)
  const [coraDrafts, setCoraDrafts] = useState<DraftQuestionBankItem[]>([])
  const [coraDraftModalOpen, setCoraDraftModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const [allQuestions, topicRows, deletedRows] = await Promise.all([
      instructorApi.getQuestionBank(scope),
      instructorApi.getQuestionBankTopics(scope),
      instructorApi.getQuestionBankDeleted(scope),
    ])
    setQuestions(allQuestions)
    setTopics(topicRows)
    setDeleted(deletedRows)
  }, [scope])

  useNotificationModuleRefresh(["assessments", "question-bank"], load)

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load question bank."))
      .finally(() => setLoading(false))
  }, [ready, load])

  useEffect(() => {
    if (!ready || !scope?.courseId) return
    void consumeFacultyCoraPending(scope.instructorId, scope.courseId, "question_bank_drafts").then((pending) => {
      if (pending?.kind === "question_bank_drafts" && pending.drafts.length) {
        setCoraDrafts(pending.drafts)
        setCoraDraftModalOpen(true)
      }
    })
  }, [ready, scope?.courseId, scope?.instructorId])

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

  const typeOptions = useMemo(() => {
    const types = [...new Set(questions.map((q) => q.question_type))].sort()
    return [{ value: "ALL", label: "All types" }, ...types.map((t) => ({ value: t, label: questionBankTypeLabel(t) }))]
  }, [questions])

  const filteredAll = useMemo(
    () => filterBankQuestions(questions, search, typeFilter, difficultyFilter, topicFilter),
    [questions, search, typeFilter, difficultyFilter, topicFilter],
  )

  const filteredDeleted = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return deleted
    return deleted.filter((item) =>
      [item.question_text, item.topic, item.question_type].filter(Boolean).join(" ").toLowerCase().includes(q),
    )
  }, [deleted, search])

  const typeGroups = useMemo(() => groupQuestionsByType(questions), [questions])

  type BankListRow =
    | { key: string; kind: "question"; question: InstructorBankQuestion; deleted?: boolean }
    | { key: string; kind: "topic"; topic: InstructorBankTopic }
    | { key: string; kind: "type"; type: string; label: string; count: number }

  const listRows = useMemo((): BankListRow[] => {
    if (loading) return []
    if (tab === "all") {
      return filteredAll.map((question) => ({
        key: String(question.id),
        kind: "question",
        question,
      }))
    }
    if (tab === "deleted") {
      return filteredDeleted.map((question) => ({
        key: String(question.id),
        kind: "question",
        question,
        deleted: true,
      }))
    }
    if (tab === "topics") {
      return topics.map((topic) => ({ key: topic.name, kind: "topic", topic }))
    }
    return typeGroups.map((row) => ({
      key: row.type,
      kind: "type",
      type: row.type,
      label: row.label,
      count: row.count,
    }))
  }, [loading, tab, filteredAll, filteredDeleted, topics, typeGroups])

  const listEmptyMeta = useMemo(() => {
    if (loading) return null
    if (tab === "all") {
      return {
        icon: "library-outline" as const,
        title: questions.length === 0 ? "No questions yet" : "No matches",
        body:
          questions.length === 0
            ? "Course question bank items will appear here."
            : "Try another filter or search term.",
      }
    }
    if (tab === "topics") {
      return {
        icon: "folder-outline" as const,
        title: "No topics yet",
        body: "Questions grouped by topic will appear here.",
      }
    }
    if (tab === "types") {
      return {
        icon: "filter-outline" as const,
        title: "No question types",
        body: "Question type breakdown will appear once you add questions.",
      }
    }
    return {
      icon: "trash-outline" as const,
      title: "No deleted questions",
      body: "Soft-deleted questions can be restored from here.",
    }
  }, [loading, tab, questions.length])

  const filtersActive = typeFilter !== "ALL" || difficultyFilter !== "ALL" || topicFilter != null

  async function softDelete(question: InstructorBankQuestion) {
    if (!scope) return
    AppAlert.alert("Move to trash?", "You can restore this question within the deleted tab.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Move to trash",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActingId(question.id)
            try {
              await instructorApi.deleteQuestionBankQuestion(scope, question.id)
              setSelected(null)
              await load()
            } catch (err) {
              AppAlert.alert("Could not delete", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setActingId(null)
            }
          })()
        }},
    ])
  }

  async function restoreQuestion(question: InstructorBankQuestion) {
    if (!scope) return
    setActingId(question.id)
    try {
      await instructorApi.restoreQuestionBankQuestions(scope, [question.id])
      setSelected(null)
      await load()
    } catch (err) {
      AppAlert.alert("Could not restore", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActingId(null)
    }
  }

  async function permanentDelete(question: InstructorBankQuestion) {
    if (!scope) return
    AppAlert.alert("Delete forever?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete forever",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActingId(question.id)
            try {
              await instructorApi.permanentlyDeleteQuestionBankQuestions(scope, [question.id])
              setSelected(null)
              await load()
            } catch (err) {
              AppAlert.alert("Could not delete", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setActingId(null)
            }
          })()
        }},
    ])
  }

  function openCreateQuestion() {
    setCreateWizardOpen(true)
  }

  function openEditQuestion(question: InstructorBankQuestion) {
    setSelected(null)
    setEditorQuestionId(question.id)
    setEditorCreateMode(false)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditorQuestionId(null)
    setEditorCreateMode(false)
  }

  function openTopic(topicName: string) {
    setTopicFilter(topicName)
    setTab("all")
  }

  function openType(type: string) {
    setTypeFilter(type)
    setTab("all")
  }

  const renderBankRow = useCallback(
    ({ item }: { item: BankListRow }) => {
      if (item.kind === "question") {
        return (
          <QuestionCard
            question={item.question}
            deleted={item.deleted}
            onPress={() => setSelected(item.question)}
          />
        )
      }
      if (item.kind === "topic") {
        return <TopicCard topic={item.topic} onPress={() => openTopic(item.topic.name)} />
      }
      return <TypeCard label={item.label} count={item.count} onPress={() => openType(item.type)} />
    },
    [],
  )

  const listHeader = useMemo(
    () =>
      tab === "all" && topicFilter ? (
        <Pressable style={styles.activeFilter} onPress={() => setTopicFilter(null)}>
          <FacultyStatusPill label={`Topic: ${topicFilter}`} tone="live" />
          <Text style={[type.caption, styles.clearFilter, { color: FACULTY_QUESTION_BANK_COLOR.link }]}>
            Clear
          </Text>
        </Pressable>
      ) : null,
    [tab, topicFilter, type.caption],
  )

  const tabItems = useMemo(
    () =>
      TABS.map((t) => ({
        ...t,
        count: t.id === "deleted" && deleted.length > 0 ? deleted.length : undefined})),
    [deleted.length],
  )

  if (!ready) {
    return (
      <View style={[moduleStyles.center, styles.center]}>
        <FacultyEmptyState
          icon="library-outline"
          title="Select a course"
          body="The question bank is scoped to your active course."
        />
      </View>
    )
  }

  return (
    <View style={[moduleStyles.root, styles.shell]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabItems} tab={tab} onChange={setTab} scrollable />

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}14` }]}>
            <Text style={[type.caption, { color: tokens.danger, fontWeight: "600" }]}>{error}</Text>
          </View>
        ) : null}

        {tab === "all" || tab === "deleted" ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={tab === "deleted" ? "Search deleted questions…" : "Search question text, topic, type…"}
            filterActive={tab === "all" ? filtersActive : false}
            onOpenFilter={tab === "all" ? () => setFilterSheetOpen(true) : undefined}
            showFilter={tab === "all"}
            trailingAction={
              tab === "all"
                ? {
                    onPress: openCreateQuestion,
                    accessibilityLabel: "Create question"}
                : undefined
            }
          />
        ) : null}
      </FacultyModuleStickyHeader>

      <ModuleFlashList
        data={listRows}
        keyExtractor={(item) => item.key}
        renderItem={renderBankRow}
        extraData={tab}
        contentContainerStyle={[styles.content, listScrollPad]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={FACULTY_QUESTION_BANK_COLOR.link} />
            </View>
          ) : listEmptyMeta ? (
            <FacultyEmptyState icon={listEmptyMeta.icon} title={listEmptyMeta.title} body={listEmptyMeta.body} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_QUESTION_BANK_COLOR.link}
          />
        }
      />

      <FacultyGroupedFilterSheet
        visible={filterSheetOpen}
        title="Filters"
        subtitle="Filter by question type or difficulty."
        groups={[
          {
            id: "type",
            title: "Question type",
            value: typeFilter,
            options: typeOptions},
          {
            id: "difficulty",
            title: "Difficulty",
            value: difficultyFilter,
            options: DIFFICULTY_OPTIONS},
        ]}
        onSelect={(groupId, value) => {
          if (groupId === "type") setTypeFilter(value)
          if (groupId === "difficulty") setDifficultyFilter(value)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <FacultyQuestionBankPreviewModal
        question={selected}
        onClose={() => setSelected(null)}
        onEdit={openEditQuestion}
        onDuplicate={() => void load()}
        onDelete={selected && !selected.deleted_at ? () => void softDelete(selected) : undefined}
        onRestore={selected?.deleted_at ? () => void restoreQuestion(selected) : undefined}
        onPermanentDelete={selected?.deleted_at ? () => void permanentDelete(selected) : undefined}
        acting={selected != null && actingId === selected.id}
      />

      <FacultyQuestionBankCreateWizard
        visible={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        onSaved={() => void load()}
      />

      <FacultyQuestionBankEditorModal
        visible={editorOpen}
        questionId={editorQuestionId}
        createMode={editorCreateMode}
        onClose={closeEditor}
        onSaved={() => void load()}
      />

      <FacultyCoraQuestionBankDraftModal
        visible={coraDraftModalOpen}
        drafts={coraDrafts}
        onClose={() => setCoraDraftModalOpen(false)}
        onSaved={() => void load()}
      />
    </View>
  )
}

const QuestionCard = memo(function QuestionCard({
  question,
  deleted,
  onPress}: {
  question: InstructorBankQuestion
  deleted?: boolean
  onPress: () => void
}) {
  const preview = stripQuestionPreview(question.question_text)
  const hasDiagram = hasActiveQuestionMedia(parseBankQuestionMedia(question.question_media))
  const optionCount = question.option_count ?? parseBankOptions(question.options).length
  const meta = `${question.topic ?? "No topic"} · ${optionCount} option${optionCount === 1 ? "" : "s"} · Used in ${question.quiz_usage_count ?? 0} quiz${(question.quiz_usage_count ?? 0) === 1 ? "" : "zes"}`

  return (
    <FacultySignatureListCard
      thumb={facultyQuestionBankQuestionThumb(question.id)}
      icon="help-circle-outline"
      title={preview || "Untitled question"}
      description={meta}
      status={
        deleted
          ? { label: "Deleted", color: FACULTY_QUESTION_BANK_COLOR.deleted, icon: "trash-outline" }
          : hasDiagram
            ? { label: "Diagram", color: FACULTY_QUESTION_BANK_COLOR.diagram, icon: "image-outline" }
            : {
                label: question.difficulty ?? "medium",
                color: FACULTY_QUESTION_BANK_COLOR.medium,
                icon: "ellipse",
              }
      }
      metaLine={questionBankTypeLabel(question.question_type)}
      onPress={onPress}
    />
  )
})

const TopicCard = memo(function TopicCard({ topic, onPress }: { topic: InstructorBankTopic; onPress: () => void }) {
  return (
    <FacultySignatureListCard
      thumb={facultyQuestionBankTopicThumb(topic.name)}
      icon="folder-outline"
      title={topic.name}
      metaLine={`${topic.question_count} question${topic.question_count === 1 ? "" : "s"}`}
      onPress={onPress}
    />
  )
})

const TypeCard = memo(function TypeCard({ label, count, onPress }: { label: string; count: number; onPress: () => void }) {
  return (
    <FacultySignatureListCard
      thumb={facultyQuestionBankTypeThumb()}
      icon="grid-outline"
      title={label}
      metaLine={`${count} question${count === 1 ? "" : "s"}`}
      onPress={onPress}
    />
  )
})

const styles = StyleSheet.create({
  shell: { flex: 1},
  root: { flex: 1},
  content: { padding: 16, gap: 14 },
  center: { flex: 1, justifyContent: "center", padding: 24},
  errorBox: { borderRadius: 12, padding: 12 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  activeFilter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clearFilter: { fontWeight: "700" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  topicCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardMain: { flex: 1, gap: 8, minWidth: 0 },
  cardPills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardMeta: { fontSize: 12 },
  cardChevron: { alignSelf: "stretch", justifyContent: "center" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"}})
