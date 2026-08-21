import { useState } from "react"
import { Modal, ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import { FACULTY_COMMUNICATION_COLOR } from "../../lib/faculty-communication-theme"
import {
  FacultySheetContainer,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetSaveAction,
  FacultySheetSection,
  FacultySheetTextInput,
  useCollabSheetStyles,

} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type FacultyScope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: FacultyScope | null
  onClose: () => void
  onCreated: (threadId: number) => void
}

export function FacultyDiscussionNewThreadModal({ visible, scope, onClose, onCreated }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function reset() {
    setTitle("")
    setDescription("")
    setError("")
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    if (!scope) return
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const thread = await instructorApi.createForumThread(scope, {
        title: title.trim(),
        description: description.trim(),
      })
      if (thread?.id) {
        reset()
        onCreated(thread.id)
        onClose()
      } else {
        setError("Thread was created but could not be opened.")
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create thread.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="New thread"
          onClose={handleClose}
          accentColor={FACULTY_COMMUNICATION_COLOR.link}
          rightSlot={
            <FacultySheetSaveAction
              label="Post"
              saving={submitting}
              disabled={!title.trim() || !description.trim()}
              onPress={() => void handleSubmit()}
            />
          }
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetSection label="Thread" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Title">
              <FacultySheetTextInput value={title} onChangeText={setTitle} placeholder="Title" autoFocus />
            </FacultySheetField>
            <FacultySheetField label="Description">
              <FacultySheetTextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Start a discussion with your class…"
                multiline
              />
            </FacultySheetField>
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
