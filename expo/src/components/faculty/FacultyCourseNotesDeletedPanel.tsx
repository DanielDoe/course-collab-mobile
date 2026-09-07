import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import type { CourseDigitalNote } from "../../lib/digital-notes-api"
import { instructorCourseNotesApi, type InstructorScope } from "../../lib/instructor-content-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { FacultySearchToolbar } from "./faculty-module-shell"
import { noteContentPreviewText } from "../../lib/digital-note-content"
import { parseCircuitWorkspace, workspaceHasContent } from "../../lib/circuit-workspace"

type DeletedNote = CourseDigitalNote & { deletedAt?: string }

type Props = {
  scope: InstructorScope
  notes: DeletedNote[]
  onChanged: () => Promise<void>
  onPreview: (note: DeletedNote) => void
}

export function FacultyCourseNotesDeletedPanel({ scope, notes, onChanged, onPreview }: Props) {
  const { native, tokens, type, styles: moduleStyles } = useModuleTheme()
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.bodyText.toLowerCase().includes(q) ||
        (note.topic ?? "").toLowerCase().includes(q),
    )
  }, [notes, search])

  const pager = useFacultyListPager(filteredNotes, search, "deleted notes")
  const visibleIds = useMemo(() => filteredNotes.map((note) => note.id), [filteredNotes])
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const selectionCount = selectedIds.length

  function toggleSelected(noteId: number) {
    setSelectedIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId],
    )
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id))
      const merged = new Set([...prev, ...visibleIds])
      return Array.from(merged)
    })
  }

  async function restoreNotes(noteIds: number[]) {
    if (noteIds.length === 0 || busy) return
    setBusy(true)
    try {
      await instructorCourseNotesApi.restoreNotes(scope, noteIds)
      setSelectedIds((prev) => prev.filter((id) => !noteIds.includes(id)))
      await onChanged()
    } catch (err) {
      AppAlert.alert("Restore failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setBusy(false)
    }
  }

  function confirmPermanentDelete(noteIds: number[]) {
    const count = noteIds.length
    AppAlert.alert(
      "Permanently delete?",
      count === 1 ? "This cannot be undone." : `${count} notes will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (busy) return
              setBusy(true)
              try {
                await instructorCourseNotesApi.permanentlyDeleteNotes(scope, noteIds)
                setSelectedIds((prev) => prev.filter((id) => !noteIds.includes(id)))
                await onChanged()
              } catch (err) {
                AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
              } finally {
                setBusy(false)
              }
            })()
          },
        },
      ],
    )
  }

  return (
    <>
      <FacultySearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search deleted notes…"
        showFilter={false}
        trailingAction={
          filteredNotes.length > 0
            ? {
                icon: allVisibleSelected ? "close-circle-outline" : "checkmark-done-outline",
                accessibilityLabel: allVisibleSelected ? "Clear selection" : "Select all visible",
                onPress: toggleSelectAllVisible,
              }
            : undefined
        }
      />

      {filteredNotes.length > 0 ? (
        <Pressable
          onPress={toggleSelectAllVisible}
          style={localStyles.selectAllRow}
          accessibilityRole="button"
          accessibilityLabel={allVisibleSelected ? "Clear selection" : "Select all visible"}
        >
          <Ionicons
            name={allVisibleSelected ? "close-circle-outline" : "checkmark-done-outline"}
            size={18}
            color={tokens.accent}
          />
          <Text style={[type.caption, { color: tokens.accent, fontWeight: "700" }]}>
            {allVisibleSelected ? "Clear selection" : "Select all visible"}
          </Text>
        </Pressable>
      ) : null}

      {selectionCount > 0 ? (
        <View style={[localStyles.bulkBar, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
          <Text style={[type.bodyEmphasis, { color: native.label, flex: 1 }]}>
            {selectionCount} selected
          </Text>
          <Pressable
            onPress={() => void restoreNotes(selectedIds)}
            disabled={busy}
            style={localStyles.bulkBtn}
            accessibilityRole="button"
            accessibilityLabel="Restore selected notes"
          >
            <Ionicons name="arrow-undo-outline" size={18} color={tokens.accent} />
            <Text style={[type.caption, { color: tokens.accent, fontWeight: "700" }]}>Restore</Text>
          </Pressable>
          <Pressable
            onPress={() => confirmPermanentDelete(selectedIds)}
            disabled={busy}
            style={localStyles.bulkBtn}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete selected notes"
          >
            <Ionicons name="trash-outline" size={18} color={tokens.danger} />
            <Text style={[type.caption, { color: tokens.danger, fontWeight: "700" }]}>Delete</Text>
          </Pressable>
        </View>
      ) : null}

      {notes.length === 0 ? (
        <FacultyEmptyState icon="trash-outline" title="No deleted notes" body="Soft-deleted notes appear here." />
      ) : filteredNotes.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search." />
      ) : (
        <View style={localStyles.list}>
          {pager.items.map((note) => {
            const selected = selectedIds.includes(note.id)
            return (
              <View
                key={note.id}
                style={[
                  moduleStyles.sectionCard,
                  localStyles.row,
                  tokens.cardShadow,
                  {
                    backgroundColor: native.secondaryGrouped,
                    borderColor: selected ? tokens.accent : tokens.border,
                    borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Pressable
                  onPress={() => toggleSelected(note.id)}
                  style={localStyles.checkBtn}
                  accessibilityRole="button"
                  accessibilityLabel={selected ? "Deselect note" : "Select note"}
                >
                  <Ionicons
                    name={selected ? "checkbox" : "square-outline"}
                    size={22}
                    color={selected ? tokens.accent : native.tertiaryLabel}
                  />
                </Pressable>
                <Pressable
                  onPress={() => onPreview(note)}
                  style={localStyles.copy}
                  accessibilityRole="button"
                  accessibilityLabel={`Preview ${note.title || "Untitled note"}`}
                >
                  <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
                    {note.title || "Untitled note"}
                  </Text>
                  <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
                    {noteContentPreviewText(note.bodyText, 120) ||
                      (workspaceHasContent(parseCircuitWorkspace(note.inkWorkspace))
                        ? "Handwritten note"
                        : "No text")}
                  </Text>
                  <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                    {note.topic ? `${note.topic} · ` : ""}
                    {note.isPublished ? "Was published" : "Was draft"}
                  </Text>
                </Pressable>
                <View style={localStyles.actions}>
                  <Pressable
                    onPress={() => void restoreNotes([note.id])}
                    disabled={busy}
                    style={localStyles.actionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Restore note"
                  >
                    <Ionicons name="arrow-undo-outline" size={20} color={tokens.accent} />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmPermanentDelete([note.id])}
                    disabled={busy}
                    style={localStyles.actionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Permanently delete note"
                  >
                    <Ionicons name="trash-outline" size={20} color={tokens.danger} />
                  </Pressable>
                </View>
              </View>
            )
          })}
          <FacultyListPagerFooter pager={pager} />
        </View>
      )}
    </>
  )
}

const localStyles = StyleSheet.create({
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingVertical: 4,
  },
  list: { gap: 10 },
  bulkBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bulkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4, paddingVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  checkBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 4 },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
})
