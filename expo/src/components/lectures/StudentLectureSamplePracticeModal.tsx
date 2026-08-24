import { Modal, ScrollView, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { LectureSamplePracticeAttempt, LectureSamplePracticeConfig } from "../../lib/lecture-types"
import type { StudentSession } from "../../lib/session"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty/faculty-collab-sheet-ui"
import { StudentLectureSamplePracticePanel } from "./StudentLectureSamplePracticePanel"

type Props = {
  visible: boolean
  session: StudentSession
  lectureId: number
  studentDatabaseId: string
  courseLabel: string
  config: LectureSamplePracticeConfig
  attempts?: LectureSamplePracticeAttempt[]
  expandedId: string | null
  reviewedIds: Set<string>
  onToggle: (questionId: string) => void
  onReviewed: (questionId: string) => void
  onClose: () => void
}

export function StudentLectureSamplePracticeModal({
  visible,
  session,
  lectureId,
  studentDatabaseId,
  courseLabel,
  config,
  attempts = [],
  expandedId,
  reviewedIds,
  onToggle,
  onReviewed,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets()
  const label = config.button_label?.trim() || "Sample Practice"
  const attemptsByQuestionId = new Map(attempts.map((attempt) => [attempt.question_id, attempt]))

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
            session={session}
            lectureId={lectureId}
            studentDatabaseId={studentDatabaseId}
            courseLabel={courseLabel}
            config={config}
            attemptsByQuestionId={attemptsByQuestionId}
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
