import { Modal, ScrollView, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { LectureWorkspaceConfig } from "../../lib/lecture-types"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty/faculty-collab-sheet-ui"
import { StudentLectureWorkspacePanel } from "./StudentLectureWorkspacePanel"

type Props = {
  visible: boolean
  lectureId: number
  studentDatabaseId: string
  config: LectureWorkspaceConfig
  expandedId: string | null
  loading?: boolean
  onToggle: (questionId: string) => void
  onClose: () => void
}

export function StudentLectureWorkspaceModal({
  visible,
  lectureId,
  studentDatabaseId,
  config,
  expandedId,
  loading = false,
  onToggle,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets()
  const title = config.button_label?.trim() || config.title?.trim() || "Workspace"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title={title} onClose={onClose} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StudentLectureWorkspacePanel
            lectureId={lectureId}
            studentDatabaseId={studentDatabaseId}
            config={config}
            expandedId={expandedId}
            loading={loading}
            onToggle={onToggle}
          />
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
})
