import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  type PlaygroundSessionFilter,
} from "../../lib/faculty-playground-utils"
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
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetSubmitButton
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { useModuleTheme } from "../../lib/themed-module-shell"

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
  const { listScrollPad, scrollPad } = useFacultyStickyHeaderScrollLayout({ listTopGap: 4 })
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
  const [filter, setFilter] = useState<PlaygroundSessionFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selected, setSelected] = useState<PlaygroundSession | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
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
        instructorApi.getPlaygroundTopics(scope).catch(() => []),
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
      setError("Question count must be at least 1.")
      return
    }
    setCreating(true)
    setError("")
    try {
      await instructorApi.createPlaygroundSession(scope, {
        topics: selectedTopics,
        questionCount: count,
        durationSec: Number.isFinite(duration) ? duration : 10,
        allowedSessions: null})
      setCreateOpen(false)
      setSelectedTopics([])
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create session.")
    } finally {
      setCreating(false)
    }
  }

  const counts = useMemo(() => countPlaygroundSessionsByFilter(sessions), [sessions])
  const filtered = useMemo(
    () => filterPlaygroundSessions(sessions, filter, search),
    [sessions, filter, search],
  )

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
            showsVerticalScrollIndicator={false}
          >
            <FacultySearchToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search sessions, codes, passcodes…"
              filterActive={filtersActive}
              filterLabel={FILTER_SHEET_OPTIONS.find((o) => o.value === filter)?.label}
              onOpenFilter={() => setFilterSheetOpen(true)}
              trailingAction={{
                onPress: () => setCreateOpen(true),
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
                title={sessions.length === 0 ? "No playground sessions yet" : "No matching sessions"}
                body={
                  sessions.length === 0
                    ? "Use + in the search bar for a quick random session, or use Question bank to pick exact questions."
                    : "Try another filter or search term."
                }
              />
            ) : (
              <View style={localStyles.list}>
                {filtered.map((session) => (
                  <FacultyPlaygroundSessionCard
                    key={session.id}
                    session={session}
                    onPress={() => setSelected(session)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}

      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <FacultySheetContainer>
          <FacultySheetChrome topInset={insets.top} title="Quick random session" onClose={() => setCreateOpen(false)} />
          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, scrollPad]}
            keyboardShouldPersistTaps="handled"
          >
            <FacultySheetNotice message="Pulls random questions from selected topics. For hand-picked questions, use the Question bank tab." />
            <FacultySheetSection label="Session setup" tone={SHEET_SECTION.edit}>
              <FacultySheetField label="Questions">
                <TextInput
                  style={collabSheetStyles.fieldInput}
                  value={questionCount}
                  onChangeText={setQuestionCount}
                  keyboardType="number-pad"
                />
              </FacultySheetField>
              <FacultySheetField label="Seconds per question">
                <TextInput
                  style={collabSheetStyles.fieldInput}
                  value={durationSec}
                  onChangeText={setDurationSec}
                  keyboardType="number-pad"
                />
              </FacultySheetField>
              <FacultySheetField label="Topics (optional)">
                <View style={localStyles.topicRow}>
                  {topics.length === 0 ? (
                    <Text style={[type.caption, localStyles.topicEmpty, { color: native.secondaryLabel }]}>
                      All topics will be used if none selected.
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
            <FacultySheetSubmitButton
              label={creating ? "Creating…" : "Create & open lobby"}
              onPress={() => void createSession()}
              disabled={creating}
              loading={creating}
            />
          </ScrollView>
        </FacultySheetContainer>
      </Modal>

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
  topicRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicEmpty: { fontStyle: "italic" }})
