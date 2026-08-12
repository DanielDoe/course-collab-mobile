import { useEffect, useState } from "react"
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { duplicateBankQuestionPayload } from "../../lib/faculty-question-bank-utils"
import { instructorApi, type InstructorBankQuestion } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { FACULTY_QUESTION_BANK_COLOR } from "../../lib/faculty-question-bank-theme"
import { FacultyQuestionBankDetailContent } from "./FacultyQuestionBankDetailContent"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetSection,
  FacultySheetTextAction,

} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  question: InstructorBankQuestion | null
  onClose: () => void
  onEdit?: (question: InstructorBankQuestion) => void
  onDuplicate?: () => void
  onDelete?: () => void
  onRestore?: () => void
  onPermanentDelete?: () => void
  acting?: boolean
}

export function FacultyQuestionBankPreviewModal({
  question,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onRestore,
  onPermanentDelete,
  acting,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const { scope } = useFacultyScope()
  const [detail, setDetail] = useState<InstructorBankQuestion | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  useEffect(() => {
    if (!question) {
      setDetail(null)
      return
    }
    setDetail(question)
    if (!scope) return
    setLoadingDetail(true)
    instructorApi
      .getQuestionBankQuestion(scope, question.id)
      .then((full) => setDetail(full))
      .catch(() => setDetail(question))
      .finally(() => setLoadingDetail(false))
  }, [question, scope])

  async function handleDuplicate() {
    if (!scope || !detail) return
    setDuplicating(true)
    try {
      await instructorApi.createQuestionBankQuestion(scope, duplicateBankQuestionPayload(detail))
      onDuplicate?.()
      onClose()
    } catch (err) {
      AppAlert.alert("Could not duplicate", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setDuplicating(false)
    }
  }

  if (!question || !detail) return null

  const isDeleted = Boolean(detail.deleted_at)

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Question preview"
          onClose={onClose}
          rightSlot={
            !isDeleted && onEdit ? (
              <FacultySheetTextAction label="Edit" onPress={() => onEdit(detail)} />
            ) : undefined
          }
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {loadingDetail ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={FACULTY_QUESTION_BANK_COLOR.link} />
            </View>
          ) : null}

          <FacultyQuestionBankDetailContent question={detail} loading={loadingDetail} />

          <FacultySheetSection label="Actions" tone={SHEET_SECTION.tools}>
            {!isDeleted ? (
              <>
                {onEdit ? (
                  <FacultySheetActionRow
                    icon="create-outline"
                    label="Edit question"
                    tone="primary"
                    onPress={() => onEdit(detail)}
                  />
                ) : null}
                <FacultySheetActionRow
                  icon="copy-outline"
                  label={duplicating ? "Duplicating…" : "Duplicate"}
                  loading={duplicating}
                  disabled={duplicating || acting}
                  onPress={() => void handleDuplicate()}
                />
                {onDelete ? (
                  <FacultySheetActionRow
                    icon="trash-outline"
                    label={acting ? "Moving…" : "Move to trash"}
                    tone="danger"
                    disabled={acting || duplicating}
                    onPress={onDelete}
                  />
                ) : null}
              </>
            ) : (
              <>
                {onRestore ? (
                  <FacultySheetActionRow
                    icon="refresh-outline"
                    label={acting ? "Restoring…" : "Restore"}
                    tone="primary"
                    disabled={acting}
                    onPress={onRestore}
                  />
                ) : null}
                {onPermanentDelete ? (
                  <FacultySheetActionRow
                    icon="trash-outline"
                    label={acting ? "Deleting…" : "Delete forever"}
                    tone="danger"
                    disabled={acting}
                    onPress={onPermanentDelete}
                  />
                ) : null}
              </>
            )}
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  loadingRow: { alignItems: "center", paddingVertical: 8 },
})
