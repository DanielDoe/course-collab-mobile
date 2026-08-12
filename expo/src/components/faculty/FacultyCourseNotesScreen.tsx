import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorSession } from "../../lib/instructor-api"
import {
  instructorCourseNotesApi,
  type ModuleConfiguration,
  type ModuleTopicRow,
} from "../../lib/instructor-content-api"
import type { CourseDigitalNote } from "../../lib/digital-notes-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useModuleTheme } from "../../lib/themed-module-shell"
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
import { CircuitWorkspaceEditor } from "../ink/CircuitWorkspaceEditor"
import {
  createEmptyWorkspace,
  parseCircuitWorkspace,
  workspaceHasContent,
  type CircuitWorkspace,
} from "../../lib/circuit-workspace"

type Tab = "all" | "topics" | "configuration" | "deleted"
type ContentTab = "typed" | "ink"

const TABS: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "all", label: "All Notes", icon: "document-text-outline" },
  { id: "topics", label: "Topics", icon: "folder-outline" },
  { id: "configuration", label: "Configuration", icon: "options-outline" },
  { id: "deleted", label: "Deleted", icon: "trash-outline" },
]

export function FacultyCourseNotesScreen() {
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()
  const { tokens, native, styles: moduleStyles, type } = useModuleTheme()

  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [notes, setNotes] = useState<CourseDigitalNote[]>([])
  const [deletedNotes, setDeletedNotes] = useState<Array<CourseDigitalNote & { deletedAt?: string }>>([])
  const [topics, setTopics] = useState<ModuleTopicRow[]>([])
  const [config, setConfig] = useState<ModuleConfiguration | null>(null)
  const [sessions, setSessions] = useState<InstructorSession[]>([])
  const [topicSession, setTopicSession] = useState("ALL")
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewNote, setPreviewNote] = useState<(CourseDigitalNote & { deletedAt?: string }) | null>(null)
  const [editing, setEditing] = useState<CourseDigitalNote | null>(null)
  const [title, setTitle] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [topic, setTopic] = useState("")
  const [sessionCode, setSessionCode] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [contentTab, setContentTab] = useState<ContentTab>("typed")
  const [inkWorkspace, setInkWorkspace] = useState<CircuitWorkspace>(() => createEmptyWorkspace())
  const [saving, setSaving] = useState(false)
  const [loadingEditor, setLoadingEditor] = useState(false)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const [notesRes, deletedRes, topicsRes, configRes, sessionsRes] = await Promise.all([
      instructorCourseNotesApi.listNotes(scope),
      instructorCourseNotesApi.listDeleted(scope),
      instructorCourseNotesApi.listTopics(scope, topicSession),
      instructorCourseNotesApi.getConfiguration(scope),
      instructorApi.getSessions(scope).catch(() => ({ sessions: [] as InstructorSession[] })),
    ])
    setNotes(notesRes.notes ?? [])
    setDeletedNotes(deletedRes.notes ?? [])
    setTopics(topicsRes.topics ?? [])
    setConfig(configRes)
    setSessions(sessionsRes.sessions ?? [])
  }, [scope, topicSession])

  useEffect(() => {
    if (!ready || !scope) return
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load course notes."))
      .finally(() => setLoading(false))
  }, [ready, scope, load])

  const sessionOptions = useMemo(
    () => [
      { value: "", label: "All sections" },
      ...sessions.map((session) => ({
        value: session.code,
        label: session.code,
        detail: session.description ?? undefined,
      })),
    ],
    [sessions],
  )

  const topicSessionOptions = useMemo(
    () => [
      { value: "ALL", label: "All sections" },
      ...sessions.map((session) => ({
        value: session.code,
        label: session.code,
        detail: session.description ?? undefined,
      })),
    ],
    [sessions],
  )

  const topicOptions = useMemo(() => {
    const names = new Set<string>()
    config?.topics.forEach((row) => names.add(row.name))
    notes.forEach((note) => {
      if (note.topic?.trim()) names.add(note.topic.trim())
    })
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }))
  }, [config?.topics, notes])

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

  function openCreate() {
    setEditing(null)
    setTitle("Untitled note")
    setBodyText("")
    setTopic("")
    setSessionCode("")
    setIsPublished(false)
    setShowPreview(false)
    setContentTab("typed")
    setInkWorkspace(createEmptyWorkspace())
    setEditorOpen(true)
  }

  async function openEdit(note: CourseDigitalNote) {
    if (!scope) return
    setEditing(note)
    setTitle(note.title)
    setBodyText(note.bodyText)
    setTopic(note.topic ?? "")
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
      setSessionCode(full.session ?? "")
      setIsPublished(full.isPublished)
      setEditing(full)
      const loadedInk = parseCircuitWorkspace(full.inkWorkspace) ?? createEmptyWorkspace()
      setInkWorkspace(loadedInk)
      if (workspaceHasContent(loadedInk) && !full.bodyText.trim()) {
        setContentTab("ink")
      }
    } catch {
      // Keep list snapshot if detail fetch fails.
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
    setSaving(true)
    try {
      const payload = {
        title,
        bodyText,
        inkWorkspace,
        topic: topic.trim() || null,
        session: sessionCode.trim() || null,
        isPublished,
      }
      if (editing) {
        await instructorCourseNotesApi.updateNote(scope, editing.id, payload)
      } else {
        await instructorCourseNotesApi.createNote(scope, payload)
      }
      setEditorOpen(false)
      await load()
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
              await instructorCourseNotesApi.deleteNote(scope, note.id)
              await load()
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
              await instructorCourseNotesApi.deleteNote(scope, editing.id)
              setEditorOpen(false)
              setEditing(null)
              await load()
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
      await load()
    } catch (err) {
      AppAlert.alert("Update failed", err instanceof ApiError ? err.message : "Try again.")
    }
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} />
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

        {error ? (
          <View style={[localStyles.errorBox, { backgroundColor: `${tokens.danger}14` }]}>
            <Text style={[type.caption, { color: tokens.danger }]}>{error}</Text>
          </View>
        ) : null}
      </FacultyModuleStickyHeader>

      {loading ? (
        <View style={localStyles.loadingBox}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : (
        <ScrollView
          style={moduleStyles.scroll}
          contentContainerStyle={[moduleStyles.content, listScrollPad]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                load().finally(() => setRefreshing(false))
              }}
            />
          }
        >
          {tab === "all" ? (
            filteredNotes.length === 0 ? (
              <FacultyEmptyState
                icon="document-text-outline"
                title="No course notes"
                body="Create a note for your students. Assign a topic to organize content by module section."
              />
            ) : (
              <View style={localStyles.list}>
                {filteredNotes.map((note, index) => (
                  <FacultyCourseNoteListCard
                    key={note.id}
                    note={note}
                    index={index}
                    onPress={() => void openEdit(note)}
                    onDelete={() => deleteNote(note)}
                  />
                ))}
              </View>
            )
          ) : null}

          {tab === "topics" ? (
            topics.length === 0 ? (
              <FacultyEmptyState
                icon="folder-outline"
                title="No topics yet"
                body="Topics appear when you assign them on notes under All Notes."
              />
            ) : (
              <>
                <NativeSelect
                  placeholder="Section"
                  value={topicSession}
                  options={topicSessionOptions}
                  onChange={setTopicSession}
                />
                {topics.map((row) => {
                  const availability = row.availability?.[topicSession] ?? row.availability?.ALL
                  const enabled = availability?.is_available !== false
                  return (
                    <View key={row.name} style={[moduleStyles.card, localStyles.topicRow]}>
                      <View style={localStyles.cardCopy}>
                        <Text style={[type.bodyEmphasis, { color: native.label }]}>{row.name}</Text>
                        <Text style={[type.caption, { color: native.secondaryLabel }]}>
                          {row.note_count ?? 0} notes
                        </Text>
                      </View>
                      <Switch value={enabled} onValueChange={(value) => void toggleTopic(row.name, topicSession, value)} />
                    </View>
                  )
                })}
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
              onChanged={load}
              onPreview={openDeletedPreview}
            />
          ) : null}
        </ScrollView>
      )}

      <Modal visible={editorOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[localStyles.editorRoot, { backgroundColor: native.groupedBackground }]}>
          <View style={[localStyles.editorHeader, { borderBottomColor: native.separator }]}>
            <Pressable onPress={() => setEditorOpen(false)}>
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Cancel</Text>
            </Pressable>
            <Text style={[type.sheetTitle, { color: native.label }]}>
              {editing ? "Edit note" : "New note"}
            </Text>
            <Pressable onPress={() => void saveNote()} disabled={saving || loadingEditor}>
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>{saving ? "…" : "Save"}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={localStyles.editorBody} keyboardShouldPersistTaps="handled">
            {loadingEditor ? (
              <View style={localStyles.loadingBox}>
                <ActivityIndicator color={tokens.accent} />
              </View>
            ) : null}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor={native.tertiaryLabel}
              style={[localStyles.input, { color: native.label, borderColor: native.separator }]}
            />
            <NativeSelect
              placeholder="Topic"
              value={topic}
              options={topicOptions}
              onChange={setTopic}
              disabled={topicOptions.length === 0}
            />
            <NativeSelect
              placeholder="Section"
              value={sessionCode}
              options={sessionOptions}
              onChange={setSessionCode}
            />
            <View style={localStyles.publishRow}>
              <Text style={[type.body, { color: native.label }]}>Published</Text>
              <Switch value={isPublished} onValueChange={setIsPublished} />
            </View>
            <Pressable onPress={() => setShowPreview((value) => !value)} style={localStyles.previewToggle}>
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>
                {showPreview ? "Hide student preview" : "Show student preview"}
              </Text>
              <Ionicons name={showPreview ? "chevron-up" : "chevron-down"} size={18} color={tokens.accent} />
            </Pressable>
            {showPreview ? <MarkdownNotePreview markdown={bodyText} minHeight={160} /> : null}
            <View style={[localStyles.segmentTrack, { backgroundColor: native.fill }]}>
              <Pressable
                style={[
                  localStyles.segmentBtn,
                  contentTab === "typed" && [localStyles.segmentBtnActive, { backgroundColor: native.secondaryGrouped }],
                ]}
                onPress={() => setContentTab("typed")}
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
                placeholder="Note body (Markdown supported)"
                placeholderTextColor={native.tertiaryLabel}
                multiline
                textAlignVertical="top"
                style={[localStyles.bodyInput, { color: native.label, borderColor: native.separator }]}
              />
            ) : (
              <CircuitWorkspaceEditor workspace={inkWorkspace} onChange={setInkWorkspace} />
            )}
            {editing ? (
              <Pressable onPress={deleteNoteFromEditor} style={localStyles.deleteLink}>
                <Text style={[type.bodyEmphasis, { color: tokens.danger }]}>Delete note</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={previewOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[localStyles.editorRoot, { backgroundColor: native.groupedBackground }]}>
          <View style={[localStyles.editorHeader, { borderBottomColor: native.separator }]}>
            <Pressable onPress={() => setPreviewOpen(false)}>
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Close</Text>
            </Pressable>
            <Text style={[type.sheetTitle, { color: native.label }]} numberOfLines={1}>
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
                <MarkdownNotePreview markdown={previewNote.bodyText} minHeight={200} />
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
  deleteLink: { marginTop: 8, alignSelf: "flex-start" },
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
