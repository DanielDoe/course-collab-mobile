import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { digitalNotesApi, getCachedCourseNote, type CourseDigitalNote } from "../../lib/digital-notes-api"
import { formatRelativeTime } from "../../lib/collaboration-api"
import {
  createEmptyWorkspace,
  parseCircuitWorkspace,
  workspaceHasContent,
} from "../../lib/circuit-workspace"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  CommGroupedList,
  CommStatusChip,
} from "../faculty/faculty-communication-ui"
import { DigitalNoteRichEditor } from "./DigitalNoteRichEditor"
import { FlashInfoHintQueue, type FlashInfoHint } from "./FlashInfoHint"
import { CircuitWorkspaceViewer } from "../ink/CircuitWorkspaceViewer"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type ContentTab = "typed" | "ink"

export function CourseNoteViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const noteId = Number(id)
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [note, setNote] = useState<CourseDigitalNote | null>(null)
  const [contentTab, setContentTab] = useState<ContentTab>("typed")

  const load = useCallback(async () => {
    if (!session) return
    const cached = getCachedCourseNote(noteId)
    if (cached) {
      setNote(cached)
      const ink = parseCircuitWorkspace(cached.inkWorkspace)
      if (workspaceHasContent(ink) && !String(cached.bodyText ?? "").trim()) setContentTab("ink")
      return
    }
    const res = await digitalNotesApi.listCourseNotes(session)
    const found = (res.notes ?? []).find((row) => row.id === noteId) ?? null
    if (!found) throw new ApiError("Note not found", 404)
    setNote(found)
    const ink = parseCircuitWorkspace(found.inkWorkspace)
    if (workspaceHasContent(ink) && !String(found.bodyText ?? "").trim()) setContentTab("ink")
  }, [session, noteId])

  useEffect(() => {
    if (!session || !Number.isFinite(noteId)) {
      setLoading(false)
      setError("Note not found.")
      return
    }
    setLoading(true)
    setError("")
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load note."))
      .finally(() => setLoading(false))
  }, [session, noteId, load])

  const inkWorkspace = useMemo(
    () => parseCircuitWorkspace(note?.inkWorkspace) ?? createEmptyWorkspace(),
    [note?.inkWorkspace],
  )
  const hasInk = workspaceHasContent(inkWorkspace)

  const flashHints = useMemo<FlashInfoHint[]>(() => {
    if (!hasInk) return []
    return [
      {
        id: "course-ink",
        icon: "brush-outline",
        message: "Switch to Handwritten to view instructor ink pages.",
      },
    ]
  }, [hasInk])

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
        <Pressable onPress={() => router.back()}>
          <Text style={[type.bodyEmphasis, { color: tokens.accent, marginTop: 12 }]}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  const updatedLabel = note.updatedAt ? formatRelativeTime(note.updatedAt) : null

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: native.separator }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backIcon} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={tokens.accent} />
        </Pressable>
        <Text style={[type.navTitle, styles.topTitle]} numberOfLines={1}>
          Course note
        </Text>
        <View style={styles.backIcon} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <FlashInfoHintQueue hints={flashHints} />

        <CommGroupedList>
          <View style={styles.insetField}>
            <Text style={[type.bodyEmphasis, styles.titleText, { color: native.label }]}>
              {note.title.trim() || "Untitled"}
            </Text>
          </View>
        </CommGroupedList>

        <View style={[styles.segmentTrack, { backgroundColor: native.fill }]}>
          <Pressable
            style={[
              styles.segmentBtn,
              contentTab === "typed" && [styles.segmentBtnActive, { backgroundColor: native.secondaryGrouped }],
            ]}
            onPress={() => setContentTab("typed")}
          >
            <Text style={[type.caption, { color: contentTab === "typed" ? native.label : native.secondaryLabel, fontWeight: "600" }]}>
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
            <Text style={[type.caption, { color: contentTab === "ink" ? native.label : native.secondaryLabel, fontWeight: "600" }]}>
              Handwritten
            </Text>
          </Pressable>
        </View>

        {contentTab === "typed" ? (
          <DigitalNoteRichEditor key={note.id} value={note.bodyText} onChange={() => undefined} disabled />
        ) : hasInk ? (
          <CircuitWorkspaceViewer workspace={inkWorkspace} />
        ) : (
          <Text style={[type.caption, { color: native.tertiaryLabel, textAlign: "center", paddingVertical: 24 }]}>
            No handwritten pages for this note.
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={[styles.noteIconTile, { backgroundColor: tokens.accentSoft }]}>
            <Ionicons name="book-outline" size={20} color={tokens.accent} />
          </View>
          <View style={styles.metaCopy}>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Instructor note</Text>
            {updatedLabel ? (
              <Text style={[type.caption, { color: native.tertiaryLabel }]}>Updated {updatedLabel}</Text>
            ) : null}
          </View>
          {note.topic ? (
            <CommStatusChip label={note.topic} color={tokens.accent} soft={tokens.accentSoft} />
          ) : hasInk ? (
            <CommStatusChip label="Has ink" color={tokens.accent} soft={tokens.accentSoft} />
          ) : null}
        </View>
      </ScrollView>
    </View>
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
  topTitle: { flex: 1, minWidth: 0, textAlign: "center" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: NATIVE.pagePadding, paddingTop: 12, gap: 12 },
  segmentTrack: { flexDirection: "row", borderRadius: 10, padding: 3, gap: 4 },
  segmentBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 8 },
  segmentBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
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
  insetField: { paddingHorizontal: 14, paddingVertical: 14 },
  titleText: { fontSize: 20, letterSpacing: -0.3, lineHeight: 26 },
})
