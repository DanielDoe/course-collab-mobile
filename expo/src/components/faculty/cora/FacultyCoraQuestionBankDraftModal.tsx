import { useEffect, useRef, useState } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppAlert } from "../../../lib/app-alert"
import { ApiError } from "../../../lib/api"
import { sanitizeUserFacingError } from "../../../lib/user-facing-error"
import { validateQuestionBankDraftsForCreate } from "../../../lib/question-bank-draft-payload"
import type { DraftQuestionBankItem } from "../../../lib/question-bank-ai-types"
import { instructorApi } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { FacultyQuestionBankDraftReviewPanel } from "../question-bank/FacultyQuestionBankDraftReviewPanel"
import { FacultySheetChrome, FacultySheetModal } from "../faculty-collab-sheet-ui"
import { CoraBrand } from "../../cora/CoraBrand"

type Props = {
  visible: boolean
  drafts: DraftQuestionBankItem[]
  onClose: () => void
  onSaved: () => void
}

export function FacultyCoraQuestionBankDraftModal({ visible, drafts, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets()
  const { scope, hasCourse } = useFacultyScope()
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [localDrafts, setLocalDrafts] = useState<DraftQuestionBankItem[]>(drafts)
  const [saving, setSaving] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    if (!visible) return
    setLocalDrafts(drafts)
    setSelected(Object.fromEntries(drafts.map((d) => [d.draftId, true])))
    submittingRef.current = false
  }, [visible, drafts])

  function updateDraft(draftId: string, partial: Partial<DraftQuestionBankItem>) {
    setLocalDrafts((prev) => prev.map((d) => (d.draftId === draftId ? { ...d, ...partial } : d)))
  }

  async function handleConfirm() {
    if (submittingRef.current) return
    if (!scope || !hasCourse) {
      AppAlert.alert("Select a course", "Choose a course before adding these questions.")
      return
    }
    const toCreate = localDrafts.filter((d) => selected[d.draftId])
    const invalid = validateQuestionBankDraftsForCreate(toCreate)
    if (invalid) {
      AppAlert.alert("Cannot add questions", invalid)
      return
    }
    submittingRef.current = true
    setSaving(true)
    try {
      const result = await instructorApi.bulkCreateQuestionBankQuestions(scope, toCreate)
      const count = result.createdCount ?? toCreate.length
      onSaved()
      onClose()
      AppAlert.alert(
        "Questions added",
        `${count} question${count === 1 ? "" : "s"} added to Question Bank.`,
      )
    } catch (err) {
      if (__DEV__) {
        console.error("[faculty] bulk-create Cora drafts failed", {
          courseId: scope.courseId,
          count: toCreate.length,
          err,
        })
      }
      AppAlert.alert(
        "Could not add questions",
        sanitizeUserFacingError(
          err instanceof ApiError ? err.message : err,
          "The generated questions are still here. Check your connection and try again.",
        ),
      )
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  const confirmReady = Boolean(scope && hasCourse)

  return (
    <FacultySheetModal visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <FacultySheetChrome
          topInset={insets.top}
          title="Cora drafts"
          onClose={onClose}
          rightSlot={<CoraBrand size="sm" />}
        />
        <FacultyQuestionBankDraftReviewPanel
          drafts={localDrafts}
          selected={selected}
          onSelectedChange={setSelected}
          onUpdateDraft={updateDraft}
          onBack={onClose}
          onConfirm={() => void handleConfirm()}
          saving={saving}
          backLabel="Cancel"
          subtitle="Review Cora-generated questions before adding them to your bank."
          fillHeight
          confirmReady={confirmReady}
        />
      </View>
    </FacultySheetModal>
  )
}
