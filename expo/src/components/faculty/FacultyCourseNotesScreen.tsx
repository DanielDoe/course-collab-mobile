import { useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import { instructorCourseNotesApi } from "../../lib/instructor-content-api"
import type { CourseDigitalNote } from "../../lib/digital-notes-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import {
  useDeleteFacultyCourseNote,
  useFacultyCourseNotes,
  useSaveFacultyCourseNote,
} from "../../hooks/query/useFacultyCourseNotes"
import { createTempNumericId } from "../../lib/query"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import { QuerySkeleton } from "../query/QuerySkeleton"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { semanticSoft } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyCourseNoteListCard } from "./FacultyCourseNoteListCard"
import { FacultyCourseNotesDeletedPanel } from "./FacultyCourseNotesDeletedPanel"
import { FacultyFlashcardsTopicAvailabilitySection } from "./FacultyFlashcardsTopicAvailabilitySection"
import {
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  useFacultyStickyHeaderScrollLayout,
} from "./faculty-module-shell"
import { NativeSelect } from "../NativeSelect"
import { MarkdownNotePreview } from "../notes/MarkdownNotePreview"
import { FacultyAdminStatRow } from "./faculty-admin-ui"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { CircuitWorkspaceEditor } from "../ink/CircuitWorkspaceEditor"
import { CircuitWorkspaceViewer } from "../ink/CircuitWorkspaceViewer"
import {
  createEmptyWorkspace,
  parseCircuitWorkspace,
  workspaceHasContent,
  type CircuitWorkspace,
} from "../../lib/circuit-workspace"

type Tab = "all" | "topics" | "configuration" | "deleted"
type ContentTab = "typed" | "ink"

const NEW_TOPIC_VALUE = "__new_topic__"

function serializeEditorState(state: {
  title: string
  bodyText: string
  topic: string
  sessionCode: string
  isPublished: boolean
  inkWorkspace: CircuitWorkspace
}) {
  return JSON.stringify(state)
}

function CourseNoteContentPreview({
  bodyText,
  workspace,
}: {
  bodyText: string
  workspace: CircuitWorkspace | null
}) {
  const { native, type } = useModuleTheme()
  const hasTyped = bodyText.trim().length > 0
  const hasInk = workspaceHasContent(workspace)
  if (!hasTyped && !hasInk) {
    return (
      <Text style={[type.caption, { color: native.tertiaryLabel, textAlign: "center", paddingVertical: 16 }]}>
        No typed or handwritten content.
      </Text>
    )
  }
  return (
    <>
      {hasTyped ? <MarkdownNotePreview markdown={bodyText} minHeight={160} /> : null}
      {hasInk && workspace ? <CircuitWorkspaceViewer workspace={workspace} /> : null}
    </>
  )
}

const TABS: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "all", label: "All", icon: "document-text-outline" },
  { id: "topics", label: "Topics", icon: "folder-outline" },
  { id: "configuration", label: "Config", icon: "options-outline" },
  { id: "deleted", label: "Deleted", icon: "trash-outline" },
]

export function FacultyCourseNotesScreen() {
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout({ extraBottom: 88 })
  const { scope, ready } = useFacultyScope()
  const { tokens, native, styles: moduleStyles, type } = useModuleTheme()

  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [topicSession, setTopicSession] = useState("ALL")
  const notesQuery = useFacultyCourseNotes(ready ? scope : null, topicSession)
  const saveNoteMutation = useSaveFacultyCourseNote(scope, topicSession)
  const deleteNoteMutation = useDeleteFacultyCourseNote(scope, topicSession)
  const notes = notesQuery.notes
  const deletedNotes = notesQuery.deletedNotes
  const topics = notesQuery.topics
  const config = notesQuery.config
  const sessions = notesQuery.sessions
  const loading = notesQuery.isInitialLoading
  const refreshing = notesQuery.isRefreshing && !notesQuery.isInitialLoading
  const error = notesQuery.error instanceof ApiError
    ? notesQuery.error.message
    : notesQuery.error
      ? "Could not load course notes."
      : ""
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  useSuppressModuleSearchDock(editorOpen || previewOpen)
  const [previewNote, setPreviewNote] = useState<(CourseDigitalNote & { deletedAt?: string }) | null>(null)
  const [editing, setEditing] = useState<CourseDigitalNote | null>(null)
  const [title, setTitle] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [topic, setTopic] = useState("")
  const [topicMode, setTopicMode] = useState<"existing" | "new">("existing")
  const [customTopic, setCustomTopic] = useState("")
  const [sessionCode, setSessionCode] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [contentTab, setContentTab] = useState<ContentTab>("typed")
  const [inkWorkspace, setInkWorkspace] = useState<CircuitWorkspace>(() => createEmptyWorkspace())
  const [inkDrawing, setInkDrawing] = useState(false)
  const [editorBaseline, setEditorBaseline] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadingEditor, setLoadingEditor] = useState(false)

  const uniqueSessions = useMemo(() => {
    const seen = new Set<string>()
    return sessions.filter((session) => {
      if (seen.has(session.code)) return false
      seen.add(session.code)
      return true
    })
  }, [sessions])

  const sessionOptions = useMemo(
    () => [
      { value: "", label: "All sections" },
      ...uniqueSessions.map((session) => ({
        value: session.code,
        label: session.code,
        detail: session.description ?? undefined,
      })),
    ],
    [uniqueSessions],
  )

  const topicSessionOptions = useMemo(
    () => [
      { value: "ALL", label: "All sections" },
      ...uniqueSessions.map((session) => ({
        value: session.code,
        label: session.code,
        detail: session.description ?? undefined,
      })),
    ],
    [uniqueSessions],
  )

  const topicOptions = useMemo(() => {
    const names = new Set<string>()
    config?.topics.forEach((row) => names.add(row.name))
    notes.forEach((note) => {
      if (note.topic?.trim()) names.add(note.topic.trim())
    })
    const options = Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }))
    return [
      { value: "", label: "No topic" },
      ...options,
      { value: NEW_TOPIC_VALUE, label: "New topic…" },
    ]
  }, [config?.topics, notes])

  function effectiveTopic() {
    return (topicMode === "new" ? customTopic : topic).trim()
  }

  function currentEditorSnapshot() {
    return serializeEditorState({
      title,
      bodyText,
      topic: effectiveTopic(),
      sessionCode,
      isPublished,
      inkWorkspace,
    })
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditing(null)
    setTopicMode("existing")
    setCustomTopic("")
    setEditorBaseline(null)
  }

  function requestCloseEditor() {
    if (saving || loadingEditor) return
    if (editorBaseline != null && currentEditorSnapshot() !== editorBaseline) {
      AppAlert.alert("Discard changes?", "Unsaved edits will be lost.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: closeEditor },
      ])
      return
    }
    closeEditor()
  }

  function handleTopicChange(value: string) {
    if (value === NEW_TOPIC_VALUE) {
      setTopicMode("new")
      setTopic("")
      setCustomTopic("")
      return
    }
    setTopicMode("existing")
    setCustomTopic("")
    setTopic(value)
  }

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return notes.filter((note) => {
      if (!q) return true
      return (
        note.title.toLowerCase().includes(q) ||
        note.bodyText.toLowerCase().includes(q) ||
        (note.topic?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [notes, search])

  const notesPager = useFacultyListPager(filteredNotes, search, "notes")
  const topicsPager = useFacultyListPager(topics, topicSession, "topics")

  function openCreate() {
    const emptyInk = createEmptyWorkspace()
    setEditing(null)
    setTitle("")
    setBodyText("")
    setTopic("")
    setTopicMode("existing")
    setCustomTopic("")
    setSessionCode("")
    setIsPublished(false)
    setShowPreview(false)
    setContentTab("typed")
    setInkWorkspace(emptyInk)
    setEditorBaseline(
      serializeEditorState({
        title: "",
        bodyText: "",
        topic: "",
        sessionCode: "",
        isPublished: false,
        inkWorkspace: emptyInk,
      }),
    )
    setEditorOpen(true)
  }

  async function openEdit(note: CourseDigitalNote) {
    if (!scope) return
    setEditing(note)
    setTitle(note.title)
    setBodyText(note.bodyText)
    setTopic(note.topic ?? "")
    setTopicMode("existing")
    setCustomTopic("")
    setSessionCode(note.session ?? "")
    setIsPublished(note.isPublished)
    setShowPreview(false)
    setContentTab("typed")
    setInkWorkspace(parseCircuitWorkspace(note.inkWorkspace) ?? createEmptyWorkspace())
    setEditorOpen(true)
    setLoadingEditor(true)
    try {
      const res = await instructorCourseNotesApi.getNote(scope, note.id)
      const full = res.note
      setTitle(full.title)
      setBodyText(full.bodyText)
      setTopic(full.topic ?? "")
      setTopicMode("existing")
      setCustomTopic("")
      setSessionCode(full.session ?? "")
      setIsPublished(full.isPublished)
      setEditing(full)
      const loadedInk = parseCircuitWorkspace(full.inkWorkspace) ?? createEmptyWorkspace()
      setInkWorkspace(loadedInk)
      setEditorBaseline(
        serializeEditorState({
          title: full.title,
          bodyText: full.bodyText,
          topic: (full.topic ?? "").trim(),
          sessionCode: full.session ?? "",
          isPublished: full.isPublished,
          inkWorkspace: loadedInk,
        }),
      )
      if (workspaceHasContent(loadedInk) && !full.bodyText.trim()) {
        setContentTab("ink")
      }
    } catch (err) {
      setEditorOpen(false)
      setEditing(null)
      AppAlert.alert(
        "Could not load note",
        err instanceof ApiError ? err.message : "Failed to load note details.",
      )
    } finally {
      setLoadingEditor(false)
    }
  }

  function openDeletedPreview(note: CourseDigitalNote & { deletedAt?: string }) {
    setPreviewNote(note)
    setPreviewOpen(true)
  }

  async function saveNote() {
    if (!scope || saving) return
    if (!title.trim()) {
      AppAlert.alert("Missing title", "Enter a note title.")
      return
    }
    if (isPublished && !bodyText.trim() && !workspaceHasContent(inkWorkspace)) {
      AppAlert.alert("Add content", "Add typed or handwritten content before publishing.")
      return
    }
    setSaving(true)
    try {
      const payload = {
        title,
        bodyText,
        inkWorkspace,
        topic: effectiveTopic() || null,
        session: sessionCode.trim() || null,
        isPublished,
      }
      if (editing) {
        await saveNoteMutation.mutateAsync({ editingId: editing.id, payload })
      } else {
        await saveNoteMutation.mutateAsync({ tempId: createTempNumericId(), payload })
      }
      closeEditor()
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setSaving(false)
    }
  }

  function deleteNote(note: CourseDigitalNote) {
    if (!scope) return
    AppAlert.alert("Delete note?", note.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteNoteMutation.mutateAsync(note)
            } catch (err) {
              AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
            }
          })()
        },
      },
    ])
  }

  function deleteNoteFromEditor() {
    if (!editing) return
    AppAlert.alert("Delete note?", editing.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            if (!scope) return
            try {
              await deleteNoteMutation.mutateAsync(editing)
              closeEditor()
            } catch (err) {
              AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
            }
          })()
        },
      },
    ])
  }

  async function toggleTopic(topicName: string, session: string, isAvailable: boolean) {
    if (!scope) return
    try {
      await instructorCourseNotesApi.toggleTopic(scope, topicName, session, isAvailable)
      await notesQuery.refetch()
    } catch (err) {
      AppAlert.alert("Update failed", err instanceof ApiError ? err.message : "Try again.")
    }
  }

  if (!ready) {
    return (
      <FacultyEmptyState
        icon="document-text-outline"
        title="Select a course"
        body="Course notes require an active course."
      />
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} scrollable={false} />
        {tab === "all" ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search course notes…"
            showFilter={false}
            trailingAction={{
              onPress: openCreate,
              accessibilityLabel: "Create note",
              icon: "add",
            }}
          />
        ) : null}

        <QueryRefreshBanner
          visible={notesQuery.refreshFailed}
          onRetry={() => void notesQuery.refetch()}
        />

        {error ? (
          <View style={[localStyles.errorBox, { backgroundColor: `${tokens.danger}14` }]}>
            <Text style={[type.caption, { color: tokens.danger }]}>{error}</Text>
          </View>
        ) : null}
      </FacultyModuleStickyHeader>

      {loading ? (
        <QuerySkeleton />
      ) : (
        <ScrollView
          style={moduleStyles.scroll}
          contentContainerStyle={[moduleStyles.content, listScrollPad]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void notesQuery.refetch()
              }}
            />
          }
        >
          {tab === "all" ? (
            filteredNotes.length === 0 ? (
              <FacultyEmptyState
                icon={search.trim() ? "search-outline" : "document-text-outline"}
                title={search.trim() ? "No matches" : "No course notes"}
                body={
                  search.trim()
                    ? "Try a different search."
                    : "Create a note for your students. Assign a topic to organize content by module section."
                }
              />
            ) : (
              <View style={localStyles.list}>
                {notesPager.items.map((note, index) => (
                  <FacultyCourseNoteListCard
                    key={note.id}
                    note={note}
                    index={index}
                    onPress={() => void openEdit(note)}
                    onDelete={() => deleteNote(note)}
                  />
                ))}
                <FacultyListPagerFooter pager={notesPager} />
              </View>
            )
          ) : null}

          {tab === "topics" ? (
            topics.length === 0 ? (
              <FacultyEmptyState
                icon="folder-outline"
                title="No topics yet"
                body="Topics appear when you assign them on notes under All."
              />
            ) : (
              <>
                <NativeSelect
                  placeholder="Section"
                  value={topicSession}
                  options={topicSessionOptions}
                  onChange={setTopicSession}
                />
                {topicsPager.items.map((row) => {
                  const availability = row.availability?.[topicSession] ?? row.availability?.ALL
                  const enabled = availability?.is_available !== false
                  return (
                    <View key={row.name} style={[moduleStyles.card, localStyles.topicRow]}>
                      <View style={localStyles.cardCopy}>
                        <Text style={[type.bodyEmphasis, { color: native.label }]}>{row.name}</Text>
                        <Text style={[type.caption, { color: native.secondaryLabel }]}>
                          {row.note_count === 1 ? "1 note" : `${row.note_count ?? 0} notes`}
                        </Text>
                      </View>
                      <Switch
                        value={enabled}
                        onValueChange={(value) => void toggleTopic(row.name, topicSession, value)}
                        accessibilityLabel={`${row.name} available`}
                      />
                    </View>
                  )
                })}
                <FacultyListPagerFooter pager={topicsPager} />
              </>
            )
          ) : null}

          {tab === "configuration" && config ? (
            <View style={localStyles.configSections}>
              <FacultyAdminStatRow
                stats={[
                  {
                    label: "Sections",
                    value: String(config.sections.length),
                    icon: "people-outline",
                    iconColor: tokens.accent,
                  },
                  {
                    label: "Topics",
                    value: String(config.topics.length),
                    icon: "folder-outline",
                    iconColor: tokens.accent,
                  },
                ]}
              />
              <FacultyFlashcardsTopicAvailabilitySection config={config} onToggle={toggleTopic} />
            </View>
          ) : null}

          {tab === "deleted" && scope ? (
            <FacultyCourseNotesDeletedPanel
              scope={scope}
              notes={deletedNotes}
              onChanged={async () => {
                await notesQuery.refetch()
              }}
              onPreview={openDeletedPreview}
            />
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={editorOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={requestCloseEditor}
      >
        <View style={[localStyles.editorRoot, { backgroundColor: native.groupedBackground }]}>
          <View style={[localStyles.editorHeader, { borderBottomColor: native.separator }]}>
            <Pressable
              onPress={requestCloseEditor}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Cancel</Text>
            </Pressable>
            <Text style={[type.sheetTitle, { color: native.label }]} accessibilityRole="header">
              {editing ? "Edit note" : "New note"}
            </Text>
            <Pressable
              onPress={() => void saveNote()}
              disabled={saving || loadingEditor}
              accessibilityRole="button"
              accessibilityLabel="Save"
            >
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>{saving ? "…" : "Save"}</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={localStyles.editorBody}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEnabled={contentTab !== "ink"}
          >
            {loadingEditor ? (
              <View style={localStyles.loadingBox}>
                <ActivityIndicator color={tokens.accent} />
              </View>
            ) : null}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              accessibilityLabel="Title"
              placeholderTextColor={native.tertiaryLabel}
              style={[localStyles.input, { color: native.label, borderColor: native.separator }]}
            />
            <NativeSelect
              placeholder="Topic"
              value={topicMode === "new" ? NEW_TOPIC_VALUE : topic}
              options={topicOptions}
              onChange={handleTopicChange}
            />
            {topicMode === "new" ? (
              <TextInput
                value={customTopic}
                onChangeText={setCustomTopic}
                placeholder="New topic name"
                accessibilityLabel="New topic name"
                placeholderTextColor={native.tertiaryLabel}
                autoFocus
                style={[localStyles.input, { color: native.label, borderColor: native.separator }]}
              />
            ) : null}
            <NativeSelect
              placeholder="Section"
              value={sessionCode}
              options={sessionOptions}
              onChange={setSessionCode}
            />
            <View style={localStyles.publishRow}>
              <Text style={[type.body, { color: native.label }]}>Published</Text>
              <Switch
                value={isPublished}
                onValueChange={setIsPublished}
                accessibilityLabel="Published"
              />
            </View>
            <Pressable
              onPress={() => setShowPreview((value) => !value)}
              accessibilityRole="button"
              accessibilityLabel={showPreview ? "Hide student preview" : "Show student preview"}
              style={localStyles.previewToggle}
            >
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>
                {showPreview ? "Hide student preview" : "Show student preview"}
              </Text>
              <Ionicons name={showPreview ? "chevron-up" : "chevron-down"} size={18} color={tokens.accent} />
            </Pressable>
            {showPreview ? (
              <CourseNoteContentPreview bodyText={bodyText} workspace={inkWorkspace} />
            ) : null}
            <View style={[localStyles.segmentTrack, { backgroundColor: native.fill }]}>
              <Pressable
                style={[
                  localStyles.segmentBtn,
                  contentTab === "typed" && [localStyles.segmentBtnActive, { backgroundColor: native.secondaryGrouped }],
                ]}
                onPress={() => {
                  setInkDrawing(false)
                  setContentTab("typed")
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: contentTab === "typed" }}
                accessibilityLabel="Typed"
              >
                <Text
                  style={[
                    type.caption,
                    localStyles.segmentLabel,
                    { color: contentTab === "typed" ? native.label : native.secondaryLabel },
                  ]}
                >
                  Typed
                </Text>
              </Pressable>
              <Pressable
                style={[
                  localStyles.segmentBtn,
                  contentTab === "ink" && [localStyles.segmentBtnActive, { backgroundColor: native.secondaryGrouped }],
                ]}
                onPress={() => setContentTab("ink")}
                accessibilityRole="button"
                accessibilityState={{ selected: contentTab === "ink" }}
                accessibilityLabel="Handwritten"
              >
                <Text
                  style={[
                    type.caption,
                    localStyles.segmentLabel,
                    { color: contentTab === "ink" ? native.label : native.secondaryLabel },
                  ]}
                >
                  Handwritten
                </Text>
              </Pressable>
            </View>
            {contentTab === "typed" ? (
              <TextInput
                value={bodyText}
                onChangeText={setBodyText}
                placeholder="Markdown supported"
                accessibilityLabel="Note body"
                accessibilityHint="Markdown supported"
                placeholderTextColor={native.tertiaryLabel}
                multiline
                textAlignVertical="top"
                style={[localStyles.bodyInput, { color: native.label, borderColor: native.separator }]}
              />
            ) : (
              <CircuitWorkspaceEditor
                workspace={inkWorkspace}
                onChange={setInkWorkspace}
                onDrawingActiveChange={setInkDrawing}
              />
            )}
            {editing ? (
              <Pressable
                onPress={deleteNoteFromEditor}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
                style={({ pressed }) => [
                  localStyles.deleteBtn,
                  {
                    borderColor: `${tokens.danger}55`,
                    backgroundColor: semanticSoft(tokens.danger, tokens.isDark),
                    opacity: pressed ? NATIVE.pressedOpacity : 1,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={tokens.danger} />
                <Text style={[type.bodyEmphasis, { color: tokens.danger, fontSize: 15 }]}>Delete note</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={previewOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[localStyles.editorRoot, { backgroundColor: native.groupedBackground }]}>
          <View style={[localStyles.editorHeader, { borderBottomColor: native.separator }]}>
            <Pressable
              onPress={() => setPreviewOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Close</Text>
            </Pressable>
            <Text style={[type.sheetTitle, { color: native.label }]} numberOfLines={1} accessibilityRole="header">
              Deleted note
            </Text>
            <View style={localStyles.headerSpacer} />
          </View>
          <ScrollView contentContainerStyle={localStyles.editorBody}>
            {previewNote ? (
              <>
                <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 20 }]}>
                  {previewNote.title || "Untitled note"}
                </Text>
                {previewNote.topic ? (
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>{previewNote.topic}</Text>
                ) : null}
                <CourseNoteContentPreview
                  bodyText={previewNote.bodyText}
                  workspace={parseCircuitWorkspace(previewNote.inkWorkspace)}
                />
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const localStyles = StyleSheet.create({
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  errorBox: { marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 12 },
  list: { gap: 10 },
  cardCopy: { flex: 1, gap: 4 },
  topicRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  configSections: { gap: 28 },
  editorRoot: { flex: 1 },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: { width: 48 },
  editorBody: { padding: 16, gap: 10 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  bodyInput: {
    minHeight: 200,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    lineHeight: 22,
  },
  publishRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  previewToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deleteBtn: {
    marginTop: 16,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  segmentTrack: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {},
  segmentLabel: { fontWeight: "600" },
})
