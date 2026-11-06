import { useCallback, useEffect, useMemo, useState } from "react"
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
  type PlaygroundSession,
  type PlaygroundSessionCreateResult,
  type PlaygroundTopic} from "../../lib/instructor-api"
import {
  countPlaygroundSessionsByFilter,
  filterPlaygroundSessions,
  playgroundSessionPageCount,
  playgroundSessionPageLabel,
  slicePlaygroundSessionPage,
  type PlaygroundSessionFilter,
} from "../../lib/faculty-playground-utils"
import { NotificationListPager } from "./faculty-notifications-ui"
import { FACULTY_PLAYGROUND_COLOR } from "../../lib/faculty-playground-theme"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { consumeFacultyCoraPending } from "../../lib/faculty-cora-pending"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useFacultyModuleStyles } from "../../lib/faculty-themed-ui"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyStickyHeaderScrollLayout,
  FacultyFilterSheet,
  FacultyModuleStickyHeader,
  FacultySearchToolbar,
  FacultySegmentedControl,
  type FacultyFilterOption} from "./faculty-module-shell"
import { FacultyPlaygroundQuestionBank } from "./FacultyPlaygroundQuestionBank"
import { FacultyPlaygroundSessionCard } from "./FacultyPlaygroundSessionCard"
import { FacultyPlaygroundSessionDetailModal } from "./FacultyPlaygroundSessionDetailModal"
import {
  FacultySheetModal,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetErrorBanner,
  FacultySheetSubmitButton,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { NativeSelect } from "../NativeSelect"
import { QUESTION_COUNT_OPTIONS, secondsSelectOptions } from "./FacultyNativePickers"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  canCreatePlaygroundSession,
  playgroundCreateAllowedSessions,
  playgroundCreateSourceError,
  resolvePlaygroundCreateTopics,
} from "../../lib/faculty-playground-create"
import { KeyboardAwareForm } from "../ui/KeyboardAwareForm"

const FILTER_SHEET_OPTIONS: FacultyFilterOption[] = [
  { value: "all", label: "All sessions" },
  { value: "lobby", label: "Lobby open" },
  { value: "live", label: "Live now" },
  { value: "ended", label: "Ended" },
]

type ScreenTab = "sessions" | "questions"

export function FacultyPlaygroundScreen() {

  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const { listScrollPad, scrollPad } = useFacultyStickyHeaderScrollLayout({ extraBottom: 88, listTopGap: 4 })
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const styles = useFacultyModuleStyles()
  const type = useNativeType()
  const { scope, ready } = useFacultyScope()

  const [screenTab, setScreenTab] = useState<ScreenTab>("sessions")
  const [sessions, setSessions] = useState<PlaygroundSession[]>([])
  const [topics, setTopics] = useState<PlaygroundTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<PlaygroundSessionFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selected, setSelected] = useState<PlaygroundSession | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState("")
  const [questionCount, setQuestionCount] = useState("10")
  const [durationSec, setDurationSec] = useState("10")
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [topicSearchHint, setTopicSearchHint] = useState<string | undefined>()

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    try {
      const [nextSessions, nextTopics] = await Promise.all([
        instructorApi.getPlaygroundSessions(scope),
        instructorApi.getPlaygroundTopics(scope),
      ])
      setSessions(nextSessions)
      setTopics(nextTopics)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load playground sessions.")
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

  useEffect(() => {
    if (!ready || !scope) return
    const hasLive = sessions.some((s) => s.is_active)
    if (!hasLive) return
    const timer = setInterval(() => void load(), 12000)
    return () => clearInterval(timer)
  }, [ready, scope, sessions, load])

  useEffect(() => {
    if (!ready || !scope?.courseId) return
    void consumeFacultyCoraPending(scope.instructorId, scope.courseId, "playground_topic").then((pending) => {
      if (pending?.kind !== "playground_topic" || !pending.topic.trim()) return
      if (pending.openQuestionsTab) setScreenTab("questions")
      setTopicSearchHint(pending.topic.trim())
      if (pending.questionCount != null && pending.questionCount > 0) {
        setQuestionCount(String(pending.questionCount))
      }
    })
  }, [ready, scope?.courseId, scope?.instructorId])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh playground.")
    } finally {
      setRefreshing(false)
    }
  }

  async function handleUpdated() {
    await load()
    if (selected) {
      const fresh = (await instructorApi.getPlaygroundSessions(scope!)).find((s) => s.id === selected.id)
      if (fresh) setSelected(fresh)
    }
  }

  async function handleBankSessionCreated(result: PlaygroundSessionCreateResult) {
    await load()
    setScreenTab("sessions")
    if (result.sessionId) {
      const fresh = (await instructorApi.getPlaygroundSessions(scope!)).find((s) => s.id === result.sessionId)
      if (fresh) setSelected(fresh)
    }
  }

  function selectFilter(next: string) {
    setFilter(next as PlaygroundSessionFilter)
    setPage(0)
    setFilterSheetOpen(false)
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    )
  }

  async function createSession() {
    if (!scope) return
    const count = Number.parseInt(questionCount, 10)
    const duration = Number.parseInt(durationSec, 10)
    if (!Number.isFinite(count) || count < 1) {
      setCreateError("Question count must be at least 1.")
      return
    }
    const resolvedTopics = resolvePlaygroundCreateTopics(
      selectedTopics,
      topics.map((t) => t.topic),
    )
    const sourceError = playgroundCreateSourceError(resolvedTopics)
    if (sourceError) {
      setCreateError(sourceError)
      return
    }
    setCreating(true)
    setCreateError("")
    try {
      await instructorApi.createPlaygroundSession(scope, {
        topics: resolvedTopics,
        questionCount: count,
        durationSec: Number.isFinite(duration) ? duration : 10,
        allowedSessions: playgroundCreateAllowedSessions(scope.sessionId),
      })
      setCreateOpen(false)
      setSelectedTopics([])
      await load()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Could not create session.")
    } finally {
      setCreating(false)
    }
  }

  const counts = useMemo(() => countPlaygroundSessionsByFilter(sessions), [sessions])
  const filtered = useMemo(
    () => filterPlaygroundSessions(sessions, filter, search),
    [sessions, filter, search],
  )
  const pageCount = playgroundSessionPageCount(filtered.length)
  const safePage = Math.min(page, pageCount - 1)
  const paged = useMemo(
    () => slicePlaygroundSessionPage(filtered, safePage),
    [filtered, safePage],
  )

  useEffect(() => {
    setPage(0)
  }, [search, filter])

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [page, pageCount])

  const filtersActive = filter !== "all"

  if (!ready) {
    return (
      <View style={styles.center}>
        <FacultyEmptyState
          icon="flash-outline"
          title="Select a course"
          body="Playground session control requires an active course."
        />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FacultyModuleStickyHeader>
        <FacultySegmentedControl
          value={screenTab}
          onChange={setScreenTab}
          options={[
            { id: "sessions", label: "Sessions" },
            { id: "questions", label: "Question bank" },
          ]}
        />
      </FacultyModuleStickyHeader>

      {screenTab === "questions" && scope ? (
        <FacultyPlaygroundQuestionBank
          scope={scope}
          topics={topics}
          topicSearchHint={topicSearchHint}
          onSessionCreated={(result) => void handleBankSessionCreated(result)}
          onReloadTopics={load}
        />
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, listScrollPad]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_PLAYGROUND_COLOR.link} />
            }
            keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <FacultySearchToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search sessions…"
              filterActive={filtersActive}
              filterLabel={FILTER_SHEET_OPTIONS.find((o) => o.value === filter)?.label}
              onOpenFilter={() => setFilterSheetOpen(true)}
              trailingAction={{
                onPress: () => {
                  setCreateError("")
                  setCreateOpen(true)
                },
                accessibilityLabel: "Create playground session"}}
            />

            <FacultyFilterSheet
              visible={filterSheetOpen}
              title="Filter sessions"
              subtitle="Show all playground sessions or focus on lobby, live, or ended."
              options={FILTER_SHEET_OPTIONS.map((o) => ({
                ...o,
                label: o.value === "all" ? o.label : `${o.label} (${counts[o.value as PlaygroundSessionFilter]})`}))}
              value={filter}
              onSelect={selectFilter}
              onClose={() => setFilterSheetOpen(false)}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={localStyles.loadingBox}>
                <ActivityIndicator color={FACULTY_PLAYGROUND_COLOR.link} size="large" />
              </View>
            ) : filtered.length === 0 ? (
              <FacultyEmptyState
                icon="flash-outline"
                title={sessions.length === 0 ? "No playground sessions yet" : search.trim() ? "No matches" : "No matching sessions"}
                body={
                  sessions.length === 0
                    ? "Use + in the search bar for a quick random session, or use Question bank to pick exact questions."
                    : "Try another filter or search term."
                }
              />
            ) : (
              <View style={localStyles.list}>
                {paged.map((session) => (
                  <FacultyPlaygroundSessionCard
                    key={session.id}
                    session={session}
                    onPress={() => setSelected(session)}
                  />
                ))}
                <View style={localStyles.pagerWrap}>
                  <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                    {playgroundSessionPageLabel(filtered.length, safePage)}
                  </Text>
                  <NotificationListPager
                    page={safePage}
                    pageCount={pageCount}
                    onPageChange={setPage}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </>
      )}

      <FacultySheetModal visible={createOpen} onRequestClose={() => setCreateOpen(false)}>
          <FacultySheetChrome topInset={insets.top} title="Quick random session" onClose={() => setCreateOpen(false)} />
          <KeyboardAwareForm contentContainerStyle={[collabSheetStyles.scroll, scrollPad]}>
            <FacultySheetNotice message="Pulls random questions from selected topics. For hand-picked questions, use the Question bank tab. If no topic is selected, every eligible course topic is used." />
            {createError ? <FacultySheetErrorBanner message={createError} /> : null}
            <FacultySheetSection label="Session setup" tone={SHEET_SECTION.edit}>
              <FacultySheetField label="Questions">
                <NativeSelect
                  placeholder="10 questions"
                  value={questionCount}
                  options={QUESTION_COUNT_OPTIONS}
                  onChange={setQuestionCount}
                />
              </FacultySheetField>
              <FacultySheetField label="Seconds per question">
                <NativeSelect
                  placeholder="10 seconds"
                  value={durationSec}
                  options={secondsSelectOptions(Number(durationSec))}
                  onChange={setDurationSec}
                />
              </FacultySheetField>
              <FacultySheetField label="Topics (optional)">
                <View style={localStyles.topicRow}>
                  {topics.length === 0 ? (
                    <Text style={[type.caption, localStyles.topicEmpty, { color: native.secondaryLabel }]}>
                      No topics in this course yet. Add Question Bank questions first, or pick questions on the Question bank tab.
                    </Text>
                  ) : (
                    topics.map((t) => {
                      const name = t.topic
                      const active = selectedTopics.includes(name)
                      return (
                        <Pressable
                          key={name}
                          style={[
                            styles.filterChip,
                            active && styles.filterChipActive,
                            active && { borderWidth: 1, borderColor: FACULTY_PLAYGROUND_COLOR.link },
                          ]}
                          onPress={() => toggleTopic(name)}
                          accessibilityRole="button"
                          accessibilityLabel={name}
                          accessibilityState={{ selected: active }}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              active && styles.filterChipTextActive,
                              active && { color: FACULTY_PLAYGROUND_COLOR.link },
                            ]}
                          >
                            {name}
                          </Text>
                        </Pressable>
                      )
                    })
                  )}
                </View>
              </FacultySheetField>
            </FacultySheetSection>
            {topics.length > 0 && selectedTopics.length === 0 ? (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                All topics will be used if none selected.
              </Text>
            ) : null}
            <FacultySheetSubmitButton
              label={creating ? "Creating…" : "Create & open lobby"}
              onPress={() => void createSession()}
              disabled={
                creating ||
                !canCreatePlaygroundSession(
                  resolvePlaygroundCreateTopics(
                    selectedTopics,
                    topics.map((t) => t.topic),
                  ),
                )
              }
              loading={creating}
            />
          </KeyboardAwareForm>
      </FacultySheetModal>

      <FacultyPlaygroundSessionDetailModal
        session={selected}
        scope={scope}
        onClose={() => setSelected(null)}
        onUpdated={() => void handleUpdated()}
      />
    </View>
  )
}

const localStyles = StyleSheet.create({
  loadingBox: { paddingVertical: 32, alignItems: "center" },
  list: { gap: 12 },
  pagerWrap: { gap: 8, paddingTop: 4, alignItems: "center" },
  topicRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicEmpty: { fontStyle: "italic" },
})
