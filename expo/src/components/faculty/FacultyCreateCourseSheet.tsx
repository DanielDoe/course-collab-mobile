import { useEffect, useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { instructorAdminApi } from "../../lib/instructor-admin-api"
import type { InstructorCourse } from "../../lib/instructor-api"
import { FACULTY_ADMIN_COLOR } from "../../lib/faculty-admin-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetHero,
  FacultySheetModal,
  FacultySheetNotice,
  FacultySheetSaveAction,
  FacultySheetSection,
  FacultySheetSubmitButton,
  FacultySheetTextInput,
  useCollabSheetStyles,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  visible: boolean
  instructorId: number | null
  activeTermLabel?: string | null
  activeTermId?: number | null
  onClose: () => void
  onCreated: (course: InstructorCourse) => void | Promise<void>
}

export function FacultyCreateCourseSheet({
  visible,
  instructorId,
  activeTermLabel,
  activeTermId,
  onClose,
  onCreated,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [draftCode, setDraftCode] = useState("")
  const [draftTitle, setDraftTitle] = useState("")
  const [draftUniversity, setDraftUniversity] = useState("")
  const [draftDescription, setDraftDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!visible) return
    setDraftCode("")
    setDraftTitle("")
    setDraftUniversity("")
    setDraftDescription("")
    setError("")
  }, [visible])

  async function handleCreate() {
    if (!instructorId) return
    if (!draftCode.trim() || !draftTitle.trim()) {
      setError("Course code and title are required.")
      return
    }
    setCreating(true)
    setError("")
    try {
      const created = await instructorAdminApi.createCourse(instructorId, {
        course_code: draftCode.trim(),
        course_title: draftTitle.trim(),
        description: draftDescription.trim() || null,
        university: draftUniversity.trim() || null,
        academic_term_id: activeTermId ?? null,
      })
      await onCreated(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create course.")
    } finally {
      setCreating(false)
    }
  }

  const termNotice = activeTermLabel
    ? `New offerings are linked to ${activeTermLabel}.`
    : "No active term is set — create or activate a term under Academic terms to link offerings."

  return (
    <FacultySheetModal visible={visible} onRequestClose={onClose}>
      <FacultySheetChrome
        topInset={insets.top}
        title="Create course"
        onClose={onClose}
        accentColor={FACULTY_ADMIN_COLOR.link}
        rightSlot={
          <FacultySheetSaveAction label="Create" saving={creating} onPress={() => void handleCreate()} />
        }
      />

      <ScrollView
        contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <FacultySheetHero
          title="Add a course offering"
          subtitle="Set the catalog details students and faculty will see"
          icon="school-outline"
          thumbColor={FACULTY_ADMIN_COLOR.link}
        />

        <FacultySheetNotice message={termNotice} />

        {error ? <FacultySheetErrorBanner message={error} /> : null}

        <FacultySheetSection label="Course details" tone={SHEET_SECTION.edit}>
          <FacultySheetField label="Course code">
            <FacultySheetTextInput
              value={draftCode}
              onChangeText={setDraftCode}
              placeholder="ECE2202"
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Course code"
            />
          </FacultySheetField>
          <FacultySheetField label="Course title">
            <FacultySheetTextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Digital Logic Design"
              accessibilityLabel="Course title"
            />
          </FacultySheetField>
          <FacultySheetField label="University">
            <FacultySheetTextInput
              value={draftUniversity}
              onChangeText={setDraftUniversity}
              placeholder="Prairie View A&M University"
              accessibilityLabel="University"
            />
          </FacultySheetField>
          <FacultySheetField label="Description">
            <FacultySheetTextInput
              value={draftDescription}
              onChangeText={setDraftDescription}
              placeholder="Optional course description for students"
              multiline
              accessibilityLabel="Description"
            />
          </FacultySheetField>
        </FacultySheetSection>

        <View style={{ gap: 8 }}>
          <FacultySheetSubmitButton
            label={creating ? "Creating…" : "Create course"}
            onPress={() => void handleCreate()}
            disabled={creating}
            loading={creating}
          />
          <Text style={[type.caption, { color: native.tertiaryLabel, textAlign: "center" }]}>
            You can add sections and enroll students after creating the course.
          </Text>
        </View>
      </ScrollView>
    </FacultySheetModal>
  )
}
