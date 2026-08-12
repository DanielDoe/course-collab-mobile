import { useEffect, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../../lib/app-alert'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../../lib/api"
import type { DraftQuestionBankItem } from "../../../lib/question-bank-ai-types"
import { instructorApi } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { FacultyQuestionBankDraftReviewPanel } from "../question-bank/FacultyQuestionBankDraftReviewPanel"
import { CoraBrand } from "../../cora/CoraBrand"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { useModuleTheme } from "../../../lib/themed-module-shell"
import { FACULTY_QUESTION_BANK_COLOR } from "../../../lib/faculty-question-bank-theme"

type Props = {
  visible: boolean
  drafts: DraftQuestionBankItem[]
  onClose: () => void
  onSaved: () => void
}

export function FacultyCoraQuestionBankDraftModal({ visible, drafts, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets()
  const { native, type } = useModuleTheme()
  const { scope } = useFacultyScope()
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [localDrafts, setLocalDrafts] = useState<DraftQuestionBankItem[]>(drafts)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setLocalDrafts(drafts)
    setSelected(Object.fromEntries(drafts.map((d) => [d.draftId, true])))
  }, [visible, drafts])

  function updateDraft(draftId: string, partial: Partial<DraftQuestionBankItem>) {
    setLocalDrafts((prev) => prev.map((d) => (d.draftId === draftId ? { ...d, ...partial } : d)))
  }

  async function handleConfirm() {
    if (!scope) return
    const toCreate = localDrafts.filter((d) => selected[d.draftId])
    if (!toCreate.length) return
    setSaving(true)
    try {
      await instructorApi.bulkCreateQuestionBankQuestions(scope, toCreate)
      onSaved()
      onClose()
    } catch (err) {
      AppAlert.alert("Could not save", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.root, { backgroundColor: native.groupedBackground, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: native.separator }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[type.bodyEmphasis, { color: FACULTY_QUESTION_BANK_COLOR.link }]}>Close</Text>
          </Pressable>
          <View style={styles.titleRow}>
            <CoraBrand size="sm" />
            <Text style={[type.navTitle, { color: native.label }]}>drafts</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <FacultyQuestionBankDraftReviewPanel
          drafts={localDrafts}
          selected={selected}
          onSelectedChange={setSelected}
          onUpdateDraft={updateDraft}
          onBack={onClose}
          onConfirm={() => void handleConfirm()}
          saving={saving}
          backLabel="Discard"
          subtitle="Review Cora-generated questions before adding them to your bank."
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: NATIVE.pagePadding,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerSpacer: { width: 48 },
})
