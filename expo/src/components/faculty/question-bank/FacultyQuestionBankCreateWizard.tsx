import { useCallback, useEffect, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { CustomQuestionTypeDraft } from "../../../lib/custom-question-types"
import { resolveQuestionBankTypeMeta } from "../../../lib/custom-question-types"
import { instructorApi } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { FacultySegmentedControl } from "../faculty-module-shell"
import { FacultyQuestionBankTypePicker } from "./FacultyQuestionBankTypePicker"
import { FacultyQuestionBankCreateTypePanel } from "./FacultyQuestionBankCreateTypePanel"
import { FacultyQuestionBankDescribePanel } from "./FacultyQuestionBankDescribePanel"
import { FacultyQuestionBankPdfPanel } from "./FacultyQuestionBankPdfPanel"
import { FacultyQuestionBankEditorModal } from "../FacultyQuestionBankEditorModal"
import { AppButton } from "../../theme/AppButton"
import { FACULTY_QUESTION_BANK_COLOR } from "../../../lib/faculty-question-bank-theme"
import { semanticSoft } from "../../../lib/themed-module-theme"
import { useModuleTheme } from "../../../lib/themed-module-shell"

type EntryMode = "manual" | "ai" | "pdf"
type WizardStep = 1 | 2

type Props = {
  visible: boolean
  onClose: () => void
  onSaved: () => void
}

export function FacultyQuestionBankCreateWizard({ visible, onClose, onSaved }: Props) {
  const { native, tokens, type } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_QUESTION_BANK_COLOR.link, tokens.isDark)
  const insets = useSafeAreaInsets()
  const { scope } = useFacultyScope()

  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [typeStepMode, setTypeStepMode] = useState<"select" | "create">("select")
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [entryMode, setEntryMode] = useState<EntryMode>("manual")
  const [customTypes, setCustomTypes] = useState<CustomQuestionTypeDraft[]>([])
  const [manualEditorOpen, setManualEditorOpen] = useState(false)

  const loadCustomTypes = useCallback(async () => {
    if (!scope) return
    try {
      const types = await instructorApi.getQuestionBankCustomTypes(scope)
      setCustomTypes(types)
    } catch {
      setCustomTypes([])
    }
  }, [scope])

  useEffect(() => {
    if (!visible) return
    void loadCustomTypes()
  }, [visible, loadCustomTypes])

  function resetWizard() {
    setWizardStep(1)
    setTypeStepMode("select")
    setSelectedType(null)
    setEntryMode("manual")
    setManualEditorOpen(false)
  }

  function handleClose() {
    resetWizard()
    onClose()
  }

  function handleTypeSelect(typeId: string) {
    setSelectedType(typeId)
    setTypeStepMode("select")
    setWizardStep(2)
    setEntryMode("manual")
  }

  function handleCustomTypeSaved(type: CustomQuestionTypeDraft) {
    setCustomTypes((prev) => {
      const exists = prev.some((t) => t.typeId === type.typeId)
      return exists ? prev.map((t) => (t.typeId === type.typeId ? type : t)) : [...prev, type]
    })
    handleTypeSelect(type.typeId)
  }

  function handleAiSuccess() {
    resetWizard()
    onSaved()
    onClose()
  }

  const selectedMeta = selectedType ? resolveQuestionBankTypeMeta(selectedType, customTypes) : null
  const pdfSupported = selectedType != null && !selectedType.startsWith("custom_")

  const entryOptions = [
    { id: "manual" as EntryMode, label: "Manual", icon: "create-outline" as const },
    { id: "ai" as EntryMode, label: "Describe AI", icon: "sparkles-outline" as const },
    ...(pdfSupported
      ? [{ id: "pdf" as EntryMode, label: "From PDF", icon: "document-text-outline" as const }]
      : []),
  ]

  return (
    <>
      <Modal visible={visible && !manualEditorOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.root, { backgroundColor: native.groupedBackground, paddingTop: insets.top }]}>
          <View style={[styles.header, { borderBottomColor: native.separator }]}>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={[type.bodyEmphasis, { color: FACULTY_QUESTION_BANK_COLOR.link }]}>Cancel</Text>
            </Pressable>
            <Text style={[type.navTitle, { color: native.label }]}>
              {wizardStep === 1 ? "New question" : "Add question"}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            {wizardStep === 1 ? (
              typeStepMode === "create" ? (
                <FacultyQuestionBankCreateTypePanel
                  onSaved={handleCustomTypeSaved}
                  onCancel={() => setTypeStepMode("select")}
                />
              ) : (
                <>
                  <FacultyQuestionBankTypePicker
                    value={selectedType}
                    customTypes={customTypes}
                    onChange={handleTypeSelect}
                    onCreateNewType={() => setTypeStepMode("create")}
                  />
                  {selectedType ? (
                    <AppButton
                      label={`Continue with ${selectedMeta?.label ?? selectedType}`}
                      onPress={() => setWizardStep(2)}
                      variant="primary"
                    />
                  ) : null}
                </>
              )
            ) : selectedType ? (
              <>
                <View
                  style={[
                    styles.typeBanner,
                    { backgroundColor: linkSoft, borderColor: FACULTY_QUESTION_BANK_COLOR.link },
                  ]}
                >
                  <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link, fontWeight: "700" }]}>
                    {selectedMeta?.label ?? selectedType}
                  </Text>
                  <Pressable onPress={() => setWizardStep(1)} hitSlop={8}>
                    <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link }]}>Change type</Text>
                  </Pressable>
                </View>

                <FacultySegmentedControl value={entryMode} onChange={setEntryMode} options={entryOptions} />

                {entryMode === "manual" ? (
                  <View style={styles.manualBox}>
                    <Text style={[type.body, { color: native.secondaryLabel }]}>
                      Build the full question with options, media, grading, and feedback fields.
                    </Text>
                    <AppButton
                      label="Open manual builder"
                      onPress={() => setManualEditorOpen(true)}
                      variant="primary"
                      icon="create-outline"
                    />
                  </View>
                ) : null}

                {entryMode === "ai" ? (
                  <FacultyQuestionBankDescribePanel
                    questionType={selectedType}
                    customTypes={customTypes}
                    onSuccess={handleAiSuccess}
                  />
                ) : null}

                {entryMode === "pdf" && pdfSupported ? (
                  <FacultyQuestionBankPdfPanel questionType={selectedType} onSuccess={handleAiSuccess} />
                ) : null}
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      {selectedType ? (
        <FacultyQuestionBankEditorModal
          visible={manualEditorOpen}
          createMode
          initialQuestionType={selectedType}
          onClose={() => setManualEditorOpen(false)}
          onSaved={() => {
            setManualEditorOpen(false)
            handleAiSuccess()
          }}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: { width: 56 },
  body: { padding: 16, gap: 16 },
  typeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  manualBox: { gap: 12 },
})
