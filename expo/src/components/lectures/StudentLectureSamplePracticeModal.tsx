import { Modal, ScrollView, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { LectureSamplePracticeConfig } from "../../lib/lecture-types"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty/faculty-collab-sheet-ui"
import { StudentLectureSamplePracticePanel } from "./StudentLectureSamplePracticePanel"

type Props = {
  visible: boolean
  lectureId: number
  studentDatabaseId: string
  courseLabel: string
  config: LectureSamplePracticeConfig
  expandedId: string | null
  reviewedIds: Set<string>
  onToggle: (questionId: string) => void
  onReviewed: (questionId: string) => void
  onClose: () => void
}

export function StudentLectureSamplePracticeModal({
  visible,
  lectureId,
  studentDatabaseId,
  courseLabel,
  config,
  expandedId,
  reviewedIds,
  onToggle,
  onReviewed,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets()
  const label = config.button_label?.trim() || "Sample Practice"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title={label} onClose={onClose} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          <StudentLectureSamplePracticePanel
            lectureId={lectureId}
            studentDatabaseId={studentDatabaseId}
            courseLabel={courseLabel}
            config={config}
            expandedId={expandedId}
            reviewedIds={reviewedIds}
            onToggle={onToggle}
            onReviewed={onReviewed}
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
