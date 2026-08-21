import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  digitalNotesApi,
  type DigitalNoteShare,
  type RosterStudent,
  type StudentDigitalNote,
} from "../../lib/digital-notes-api"
import { noteBodyForEditor } from "../../lib/markdown-note-content"
import { noteContentForSaveFromEditable } from "../../lib/digital-note-html-edit"
import {
  createEmptyWorkspace,
  parseCircuitWorkspace,
  workspaceHasContent,
  type CircuitWorkspace,
} from "../../lib/circuit-workspace"
import { formatRelativeTime } from "../../lib/collaboration-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  CommGroupedList,
  CommListRow,
  CommStatusChip,
} from "../faculty/faculty-communication-ui"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty/faculty-collab-sheet-ui"
import { FlashInfoHintQueue, type FlashInfoHint } from "./FlashInfoHint"
import { DigitalNoteRichEditor, type DigitalNoteRichEditorHandle } from "./DigitalNoteRichEditor"
import { CircuitWorkspaceEditor } from "../ink/CircuitWorkspaceEditor"
import { CircuitWorkspaceViewer } from "../ink/CircuitWorkspaceViewer"
import { useDebouncedCallback } from "../../lib/use-debounced-callback"
import { exportDigitalNoteJson, exportDigitalNotePlainText } from "../../lib/digital-note-export"

type ContentTab = "typed" | "ink"
type SaveStatus = "idle" | "saving" | "saved" | "error"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const noteId = Number(id)
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [error, setError] = useState("")
  const [note, setNote] = useState<StudentDigitalNote | null>(null)
  const [title, setTitle] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [inkWorkspace, setInkWorkspace] = useState<CircuitWorkspace>(() => createEmptyWorkspace())
  const [contentTab, setContentTab] = useState<ContentTab>("typed")
  const [shareOpen, setShareOpen] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareSaving, setShareSaving] = useState(false)
  const [shareError, setShareError] = useState("")
  const [roster, setRoster] = useState<RosterStudent[]>([])
  const [selectedShareIds, setSelectedShareIds] = useState<number[]>([])
  const [shareCount, setShareCount] = useState(0)
  const originalBodyRef = useRef("")
  const richEditorRef = useRef<DigitalNoteRichEditorHandle>(null)
  const loadedRef = useRef(false)
  const saveInFlightRef = useRef(false)
  const parsedServerInk = useMemo(
    () => (note ? parseCircuitWorkspace(note.inkWorkspace) : null),
    [note?.inkWorkspace],
  )

  const readOnly = note?.isOwner === false
  const hasInk = workspaceHasContent(inkWorkspace) || workspaceHasContent(parsedServerInk)
  const footerHeight = readOnly ? 0 : 56 + insets.bottom

  const noteSnapshotForExport = useCallback((): StudentDigitalNote | null => {
    if (!note) return null
    const bodyForSave =
      richEditorRef.current?.getHtmlForSave() ??
      noteContentForSaveFromEditable(bodyHtml, originalBodyRef.current)
    return {
      ...note,
      title,
      bodyText: bodyForSave,
      inkWorkspace: workspaceHasContent(inkWorkspace) ? inkWorkspace : null,
    }
  }, [note, title, bodyHtml, inkWorkspace])

  const persistNote = useCallback(
    async (patch?: { title?: string; bodyText?: string; inkWorkspace?: CircuitWorkspace }) => {
      if (!session || !note || readOnly || saveInFlightRef.current) return false
      saveInFlightRef.current = true
      setSaveStatus("saving")
      try {
        const payloadBody =
          patch?.bodyText ??
          richEditorRef.current?.getHtmlForSave() ??
          noteContentForSaveFromEditable(bodyHtml, originalBodyRef.current)
        const res = await digitalNotesApi.updateNote(session, note.id, {
          title: patch?.title ?? title,
          bodyText: payloadBody,
          inkWorkspace: patch?.inkWorkspace ?? inkWorkspace,
        })
        originalBodyRef.current = res.note.bodyText
        setBodyHtml(res.note.bodyText)
        setInkWorkspace(parseCircuitWorkspace(res.note.inkWorkspace) ?? inkWorkspace)
        setNote(res.note)
        setSaveStatus("saved")
        return true
      } catch (err) {
        setSaveStatus("error")
        AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Try again.")
        return false
      } finally {
        saveInFlightRef.current = false
      }
    },
    [session, note, readOnly, title, bodyHtml, inkWorkspace],
  )

  const debouncedSave = useDebouncedCallback(
    (patch: { title?: string; bodyText?: string; inkWorkspace?: CircuitWorkspace }) => {
      void persistNote(patch)
    },
    900,
  )

  useEffect(() => {
    if (!note || readOnly || loading) return
    if (!loadedRef.current) {
      loadedRef.current = true
      return
    }
    debouncedSave({})
  }, [title, bodyHtml, inkWorkspace, note, readOnly, loading, debouncedSave])

  useEffect(() => {
    loadedRef.current = false
    setSaveStatus("idle")
  }, [noteId])

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(noteId)) return
    const res = await digitalNotesApi.getNote(session, noteId)
    const rawBody = res.note.bodyText ?? ""
    const editorBody = noteBodyForEditor(rawBody)
    originalBodyRef.current = editorBody
    setNote(res.note)
    setTitle(res.note.title)
    setBodyHtml(editorBody)
    setInkWorkspace(parseCircuitWorkspace(res.note.inkWorkspace) ?? createEmptyWorkspace())
    const loadedInk = parseCircuitWorkspace(res.note.inkWorkspace)
    if (workspaceHasContent(loadedInk) && !rawBody.trim()) {
      setContentTab("ink")
    }
  }, [session, noteId])

  useEffect(() => {
    if (!session || !Number.isFinite(noteId)) return
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load note."))
      .finally(() => setLoading(false))
  }, [session, noteId, load])

  async function flushSave() {
    await persistNote()
  }

  function openExportMenu() {
    const snapshot = noteSnapshotForExport()
    if (!snapshot) return
    AppAlert.alert("Export note", "Choose a format to share or save elsewhere.", [
      {
        text: "JSON backup",
        onPress: () => {
          void exportDigitalNoteJson(snapshot).catch((err) =>
            AppAlert.alert("Export failed", err instanceof Error ? err.message : "Try again."),
          )
        },
      },
      {
        text: "Plain text",
        onPress: () => {
          void exportDigitalNotePlainText(snapshot).catch((err) =>
            AppAlert.alert("Export failed", err instanceof Error ? err.message : "Try again."),
          )
        },
      },
      { text: "Cancel", style: "cancel" },
    ])
  }

  function confirmDelete() {
    if (!session || !note || readOnly) return
    AppAlert.alert("Delete note?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await digitalNotesApi.deleteNote(session, note.id)
              router.back()
            } catch (err) {
              AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
            }
          })()
        },
      },
    ])
  }

  const loadShareDialog = useCallback(async () => {
    if (!session || !note) return
    setShareLoading(true)
    setShareError("")
    try {
      const [rosterRes, sharesRes] = await Promise.all([
        digitalNotesApi.listClassmates(session),
        digitalNotesApi.getShares(session, note.id),
      ])
      const selfId = Number(session.databaseId)
      setRoster((rosterRes.students ?? []).filter((s) => s.id !== selfId))
      setSelectedShareIds((sharesRes.shares ?? []).map((s: DigitalNoteShare) => s.studentDatabaseId))
    } catch (err) {
      setShareError(err instanceof ApiError ? err.message : "Could not load classmates.")
      setRoster([])
      setSelectedShareIds([])
    } finally {
      setShareLoading(false)
    }
  }, [session, note])

  function openShareSheet() {
    if (!session?.section?.trim()) {
      AppAlert.alert(
        "Share unavailable",
        "Your class section is missing from this session. Log out and sign in again, then retry.",
      )
      return
    }
    setShareError("")
    setShareOpen(true)
  }

  useEffect(() => {
    if (shareOpen) void loadShareDialog()
  }, [shareOpen, loadShareDialog])

  useEffect(() => {
    if (!session || !Number.isFinite(noteId) || !note || note.isOwner === false) return
    void digitalNotesApi
      .getShares(session, noteId)
      .then((res) => setShareCount((res.shares ?? []).length))
      .catch(() => setShareCount(0))
  }, [session, noteId, note])

  async function saveShares() {
    if (!session || !note) return
    setShareSaving(true)
    try {
      await digitalNotesApi.updateShares(session, note.id, selectedShareIds)
      setShareCount(selectedShareIds.length)
      setShareOpen(false)
    } catch (err) {
      AppAlert.alert("Share failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setShareSaving(false)
    }
  }

  const flashHints = useMemo<FlashInfoHint[]>(() => {
    if (!note) return []
    const hints: FlashInfoHint[] = []
    if (readOnly) {
      hints.push({
        id: "shared-readonly",
        icon: "people-outline",
        message: `Shared by ${note.ownerName ?? "a classmate"} · read only`,
      })
    }
    if (hasInk && readOnly) {
      hints.push({
        id: "ink-workspace",
        icon: "brush-outline",
        message: "Handwritten pages are shown in the Ink tab below.",
      })
    }
    return hints
  }, [note, readOnly, hasInk])

  const segmentTrackStyle = [styles.segmentTrack, { backgroundColor: native.fill }]

  const saveStatusLabel = useMemo(() => {
    if (readOnly) return null
    if (saveStatus === "saving") return "Saving…"
    if (saveStatus === "saved") return "Saved"
    if (saveStatus === "error") return "Save failed"
    return null
  }, [readOnly, saveStatus])

  const updatedLabel = note?.updatedAt ? formatRelativeTime(note.updatedAt) : null

  if (!session || !Number.isFinite(noteId)) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.body, { color: native.secondaryLabel }]}>Invalid note.</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    )
  }

  if (error || !note) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.body, { color: tokens.danger }]}>{error || "Note not found."}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: native.groupedBackground }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: native.separator }]}>
        <Pressable
          onPress={() => {
            void flushSave().finally(() => router.back())
          }}
          hitSlop={8}
          style={styles.backIcon}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={tokens.accent} />
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Text style={[type.navTitle, styles.topTitle]} numberOfLines={1}>
            {readOnly ? "Shared note" : "Edit note"}
          </Text>
          {saveStatusLabel ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
              {saveStatusLabel}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={openExportMenu}
          hitSlop={8}
          style={styles.shareIcon}
          accessibilityLabel="Export note"
        >
          <Ionicons name="download-outline" size={22} color={tokens.accent} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: footerHeight + 16 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <FlashInfoHintQueue hints={flashHints} />

        <CommGroupedList>
          {readOnly ? (
            <View style={styles.insetField}>
              <Text style={[type.bodyEmphasis, styles.readOnlyTitle, { color: native.label }]}>
                {title.trim() || "Untitled"}
              </Text>
            </View>
          ) : (
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor={native.tertiaryLabel}
              style={[styles.titleInput, type.bodyEmphasis, { color: native.label }]}
            />
          )}
        </CommGroupedList>

        <View style={segmentTrackStyle}>
          <Pressable
            style={[
              styles.segmentBtn,
              contentTab === "typed" && [styles.segmentBtnActive, { backgroundColor: native.secondaryGrouped }],
            ]}
            onPress={() => setContentTab("typed")}
          >
            <Text
              style={[
                type.caption,
                { color: contentTab === "typed" ? native.label : native.secondaryLabel, fontWeight: "600" },
              ]}
            >
              Typed
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.segmentBtn,
              contentTab === "ink" && [styles.segmentBtnActive, { backgroundColor: native.secondaryGrouped }],
            ]}
            onPress={() => setContentTab("ink")}
          >
            <Text
              style={[
                type.caption,
                { color: contentTab === "ink" ? native.label : native.secondaryLabel, fontWeight: "600" },
              ]}
            >
              Handwritten
            </Text>
          </Pressable>
        </View>

        {contentTab === "typed" ? (
          <DigitalNoteRichEditor
            ref={richEditorRef}
            noteKey={note.id}
            noteId={note.id}
            session={session}
            value={bodyHtml}
            onChange={setBodyHtml}
            disabled={readOnly}
            placeholder="Start typing your notes…"
          />
        ) : readOnly ? (
          <CircuitWorkspaceViewer workspace={inkWorkspace} />
        ) : (
          <CircuitWorkspaceEditor workspace={inkWorkspace} onChange={setInkWorkspace} disabled={readOnly} />
        )}

        {!readOnly ? (
          <CommGroupedList>
            <CommListRow
              icon="people-outline"
              iconColor={tokens.accent}
              iconSoft={tokens.accentSoft}
              title="Share with classmates"
              subtitle={
                shareCount > 0
                  ? `Shared with ${shareCount} classmate${shareCount === 1 ? "" : "s"}`
                  : "Choose who can view this note"
              }
              onPress={openShareSheet}
              isLast
            />
          </CommGroupedList>
        ) : null}

        <View style={styles.metaRow}>
          <View style={[styles.noteIconTile, { backgroundColor: tokens.accentSoft }]}>
            <Ionicons name="document-text-outline" size={20} color={tokens.accent} />
          </View>
          <View style={styles.metaCopy}>
            {readOnly && note.ownerName ? (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                From {note.ownerName}
              </Text>
            ) : (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Your note</Text>
            )}
            {updatedLabel ? (
              <Text style={[type.caption, { color: native.tertiaryLabel }]}>Updated {updatedLabel}</Text>
            ) : null}
          </View>
          {readOnly ? (
            <CommStatusChip label="Read only" color={native.secondaryLabel} soft={native.fill} />
          ) : hasInk ? (
            <CommStatusChip label="Has ink" color={tokens.accent} soft={tokens.accentSoft} />
          ) : null}
        </View>
      </ScrollView>

      {!readOnly ? (
        <View
          style={[
            styles.footerBar,
            NATIVE.raisedShadow,
            {
              paddingBottom: insets.bottom + 12,
              borderTopColor: native.separator,
              backgroundColor: native.secondaryGrouped,
            },
          ]}
        >
          <Pressable
            onPress={openShareSheet}
            style={({ pressed }) => [
              styles.footerBtn,
              styles.shareFooterBtn,
              {
                borderColor: native.separator,
                backgroundColor: tokens.accentSoft,
                opacity: pressed ? NATIVE.pressedOpacity : 1,
              },
            ]}
            accessibilityLabel={
              shareCount > 0
                ? `Share note with classmates, currently shared with ${shareCount}`
                : "Share note with classmates"
            }
          >
            <Ionicons name="share-outline" size={18} color={tokens.accent} />
            <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>
              {shareCount > 0 ? `Share · ${shareCount}` : "Share"}
            </Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.footerBtn,
              styles.deleteBtn,
              { borderColor: native.separator, opacity: pressed ? NATIVE.pressedOpacity : 1 },
            ]}
            accessibilityLabel="Delete note"
          >
            <Ionicons name="trash-outline" size={18} color={tokens.danger} />
            <Text style={[type.bodyEmphasis, { color: tokens.danger }]}>Delete</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={shareOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShareOpen(false)}>
        <FacultySheetContainer style={[styles.shareRoot, { backgroundColor: native.groupedBackground }]}>
          <FacultySheetChrome
            topInset={insets.top}
            title="Share with classmates"
            onClose={() => setShareOpen(false)}
          />
          {shareLoading ? (
            <View style={styles.shareLoading}>
              <ActivityIndicator color={tokens.accent} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.shareList, { paddingBottom: insets.bottom + 88 }]}
              keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
            >
              {shareError ? (
                <View style={[styles.shareErrorBox, { backgroundColor: `${tokens.danger}14` }]}>
                  <Text style={[type.caption, { color: tokens.danger }]}>{shareError}</Text>
                  <Pressable onPress={() => void loadShareDialog()} hitSlop={8}>
                    <Text style={[type.caption, { color: tokens.accent, fontWeight: "700" }]}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              {!shareError && roster.length === 0 ? (
                <Text style={[type.caption, { color: native.secondaryLabel, padding: 16 }]}>
                  No classmates found in your section.
                </Text>
              ) : (
                roster.map((student) => {
                  const selected = selectedShareIds.includes(student.id)
                  return (
                    <Pressable
                      key={student.id}
                      onPress={() =>
                        setSelectedShareIds((prev) =>
                          selected ? prev.filter((sid) => sid !== student.id) : [...prev, student.id],
                        )
                      }
                      style={[styles.shareRow, { borderBottomColor: native.separator }]}
                    >
                      <Ionicons
                        name={selected ? "checkbox" : "square-outline"}
                        size={22}
                        color={selected ? tokens.accent : native.tertiaryLabel}
                      />
                      <View style={styles.shareCopy}>
                        <Text style={[type.bodyEmphasis, { color: native.label }]}>{student.full_name}</Text>
                        {student.student_id ? (
                          <Text style={[type.caption, { color: native.secondaryLabel }]}>{student.student_id}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  )
                })
              )}
            </ScrollView>
          )}
          <View style={[styles.shareFooter, { paddingBottom: insets.bottom + 12, borderTopColor: native.separator }]}>
            <Pressable
              onPress={() => void saveShares()}
              disabled={shareSaving || shareLoading || Boolean(shareError)}
              style={[
                styles.shareSave,
                { backgroundColor: tokens.accent },
                (shareSaving || shareLoading || shareError) && styles.shareSaveDisabled,
              ]}
            >
              {shareSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save sharing</Text>
              )}
            </Pressable>
          </View>
        </FacultySheetContainer>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: NATIVE.pagePadding,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backIcon: { width: 28 },
  topTitleWrap: { flex: 1, minWidth: 0, alignItems: "center", gap: 2 },
  topTitle: { textAlign: "center" },
  shareIcon: { width: 28, alignItems: "flex-end" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: NATIVE.pagePadding, paddingTop: 12, gap: 12 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  noteIconTile: {
    width: NATIVE.iconTileSize,
    height: NATIVE.iconTileSize,
    borderRadius: NATIVE.iconTileRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  metaCopy: { flex: 1, gap: 2 },
  fieldDivider: { height: StyleSheet.hairlineWidth, marginLeft: 14 },
  segmentTrack: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  insetField: { paddingHorizontal: 14, paddingVertical: 14 },
  titleInput: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  readOnlyTitle: { fontSize: 20, letterSpacing: -0.3, lineHeight: 26 },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
    minHeight: 48,
  },
  shareFooterBtn: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  saveBtn: {},
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backBtn: { marginTop: 12 },
  shareRoot: { flex: 1 },
  shareLoading: { paddingVertical: 48, alignItems: "center" },
  shareList: { paddingTop: 8 },
  shareErrorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 999,
    padding: 12,
    gap: 8,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shareCopy: { flex: 1, gap: 2 },
  shareFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  shareSave: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  shareSaveDisabled: { opacity: 0.55 },
})
