import { useEffect, useMemo, useState } from "react"
import { Modal, ScrollView, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorLecture } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { FacultyStatusPill } from "./faculty-shared"
import { NativeSelect } from "../NativeSelect"
import { WEEK_OPTIONS } from "./FacultyNativePickers"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetHero,
  FacultySheetSaveChip,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetToggleRow
} from "./faculty-collab-sheet-ui"
import { SHEET_LECTURE, SHEET_SECTION } from "./faculty-sheet-semantics"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"

type Props = {
  visible: boolean
  lecture: InstructorLecture | null
  onClose: () => void
  onUpdated: () => void
  onOpenEditor: (lecture: InstructorLecture) => void
  onOpenPreview: (lecture: InstructorLecture) => void
  onOpenSamplePractice: (lecture: InstructorLecture) => void
  onOpenWorkspace: (lecture: InstructorLecture) => void
  onDelete: (lecture: InstructorLecture) => void
}

function lectureHasDeck(lecture: InstructorLecture): boolean {
  return Boolean(lecture.pdf_url || lecture.document_url)
}

export function FacultyLectureActionSheet({
  visible,
  lecture,
  onClose,
  onUpdated,
  onOpenEditor,
  onOpenPreview,
  onOpenSamplePractice,
  onOpenWorkspace,
  onDelete}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const { scope } = useFacultyScope()

  const [title, setTitle] = useState("")
  const [week, setWeek] = useState("")
  const [description, setDescription] = useState("")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!visible || !lecture) {
      setDirty(false)
      setConfirmDelete(false)
      setError("")
      return
    }
    setTitle(lecture.title)
    setWeek(String(lecture.week))
    setDescription(lecture.description ?? "")
    setDirty(false)
  }, [visible, lecture])

  const published = useMemo(
    () => lecture?.is_published ?? lecture?.is_active ?? false,
    [lecture],
  )

  if (!lecture) return null

  async function saveQuickEdits() {
    if (!scope || !lecture) return
    const weekNum = Number.parseInt(week, 10)
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    if (!Number.isFinite(weekNum)) {
      setError("Week must be a number.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await instructorApi.updateLecture(scope, lecture.id, {
        title: title.trim(),
        week: weekNum,
        description: description.trim()})
      setDirty(false)
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes.")
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish() {
    if (!scope || !lecture) return
    setToggling(true)
    setError("")
    try {
      await instructorApi.updateLecture(scope, lecture.id, { is_published: !published })
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update publish state.")
    } finally {
      setToggling(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Manage lecture" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={lecture.title}
            subtitle={`Week ${lecture.week}`}
            icon="book-outline"
            thumbColor={FACULTY_SHEET_COLOR.link}
            pills={
              <>
                <FacultyStatusPill label={published ? "Published" : "Draft"} tone={published ? "success" : "warning"} />
                <FacultyStatusPill
                  label={lectureHasDeck(lecture) ? "Deck attached" : "No deck"}
                  tone={lectureHasDeck(lecture) ? "success" : "neutral"}
                />
              </>
            }
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip icon="calendar-outline" label="Week" value={String(lecture.week)} tone={SHEET_LECTURE.week} />
            <FacultySheetStatChip icon="eye-outline" label="Views" value={String(lecture.students_viewed ?? 0)} tone={SHEET_LECTURE.views} />
            <FacultySheetStatChip
              icon="document-outline"
              label="Deck"
              value={lectureHasDeck(lecture) ? "PDF" : "—"}
              tone={lectureHasDeck(lecture) ? SHEET_LECTURE.deck : SHEET_LECTURE.deckEmpty}
            />
          </FacultySheetStatRow>

          <FacultySheetSection
            label="Quick edit"
            tone={SHEET_SECTION.edit}
            action={dirty ? <FacultySheetSaveChip saving={saving} onPress={() => void saveQuickEdits()} /> : null}
          >
            <FacultySheetField label="Title">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={title}
                onChangeText={(v) => {
                  setTitle(v)
                  setDirty(true)
                }}
              />
            </FacultySheetField>
            <FacultySheetField label="Week">
              <NativeSelect
                placeholder="Week"
                value={week}
                options={
                  WEEK_OPTIONS.some((option) => option.value === week)
                    ? WEEK_OPTIONS
                    : [...WEEK_OPTIONS, { value: week, label: `Week ${week}` }]
                }
                onChange={(v) => {
                  setWeek(v)
                  setDirty(true)
                }}
              />
            </FacultySheetField>
            <FacultySheetField label="Description">
              <TextInput
                style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                value={description}
                onChangeText={(v) => {
                  setDescription(v)
                  setDirty(true)
                }}
                multiline
                placeholder="Lecture summary, schedule notes…"
                placeholderTextColor="#94a3b8"
              />
            </FacultySheetField>
          </FacultySheetSection>

          <FacultySheetSection label="Publishing" tone={SHEET_SECTION.workflow}>
            <FacultySheetToggleRow
              icon={published ? "eye-outline" : "eye-off-outline"}
              title={published ? "Visible to students" : "Draft — hidden from students"}
              subtitle={
                published
                  ? "Students can open this lecture in the course."
                  : "Publish when the deck and content are ready."
              }
              value={published}
              disabled={toggling}
              onValueChange={() => void togglePublish()}
            />
          </FacultySheetSection>

          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetSection label="Lecture tools" tone={SHEET_SECTION.tools}>
            <FacultySheetActionRow
              icon="play-circle-outline"
              label="Preview lecture"
              subtitle="Native slide deck preview — same PDF students see"
              accent={SHEET_LECTURE.preview}
              onPress={() => onOpenPreview(lecture)}
            />
            <FacultySheetActionRow
              icon="cloud-upload-outline"
              label="Slide deck & settings"
              subtitle="Upload PDF/PPT and allow student download"
              accent={SHEET_LECTURE.slideDeck}
              onPress={() => onOpenEditor(lecture)}
            />
            <FacultySheetActionRow
              icon="sparkles-outline"
              label="Sample practice"
              subtitle="In-lecture MCQ drills on slides"
              accent={SHEET_LECTURE.samplePractice}
              onPress={() => onOpenSamplePractice(lecture)}
            />
            <FacultySheetActionRow
              icon="brush-outline"
              label="Workspace problems"
              subtitle="Ink workspace & step-by-step solutions"
              accent={SHEET_LECTURE.workspace}
              onPress={() => onOpenWorkspace(lecture)}
            />
            <FacultySheetActionRow
              icon="trash-outline"
              label="Delete lecture"
              subtitle="Permanently removes this week"
              tone="danger"
              accent="rose"
              onPress={() => setConfirmDelete(true)}
            />
          </FacultySheetSection>
        </ScrollView>

        {confirmDelete ? (
          <FacultySheetConfirm
            title="Delete lecture?"
            body={`Week ${lecture.week} — “${lecture.title}” will be removed permanently, including deck and practice content.`}
            confirmLabel="Delete"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false)
              onDelete(lecture)
            }}
          />
        ) : null}
      </FacultySheetContainer>
    </Modal>
  )
}