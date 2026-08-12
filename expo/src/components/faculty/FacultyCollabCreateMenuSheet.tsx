import { Modal, Pressable, ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  FacultySheetContainer,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetNotice,
  useCollabSheetStyles,

} from "./faculty-collab-sheet-ui"

type Props = {
  visible: boolean
  onClose: () => void
  onCreateGroup: () => void
  onCreateProject: () => void
}

export function FacultyCollabCreateMenuSheet({
  visible,
  onClose,
  onCreateGroup,
  onCreateProject,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()

  function pick(action: () => void) {
    onClose()
    action()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Create" onClose={onClose} />
        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetNotice message="Create a group or project on behalf of a student. They will appear in the student collaboration area." />
          <FacultySheetActionRow
            icon="people-outline"
            label="Create group"
            subtitle="Set up a team with a student as leader"
            tone="primary"
            onPress={() => pick(onCreateGroup)}
          />
          <Pressable style={{ height: 10 }} />
          <FacultySheetActionRow
            icon="folder-open-outline"
            label="Create project"
            subtitle="Submit a project under an approved group"
            tone="primary"
            onPress={() => pick(onCreateProject)}
          />
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
