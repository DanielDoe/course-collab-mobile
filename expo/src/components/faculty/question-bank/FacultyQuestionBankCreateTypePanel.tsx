import { useState } from "react"
import { StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../../lib/api"
import type { CustomQuestionTypeDraft } from "../../../lib/custom-question-types"
import { validateCustomQuestionTypeDraft } from "../../../lib/custom-question-types"
import { instructorApi } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { AppButton } from "../../theme/AppButton"
import { FacultySheetField, FacultySheetTextInput } from "../faculty-collab-sheet-ui"
import { FACULTY_QUESTION_BANK_COLOR } from "../../../lib/faculty-question-bank-theme"
import { useModuleTheme } from "../../../lib/themed-module-shell"

type Props = {
  onSaved: (type: CustomQuestionTypeDraft) => void
  onCancel: () => void
}

export function FacultyQuestionBankCreateTypePanel({ onSaved, onCancel }: Props) {
  const { native, type } = useModuleTheme()
  const { scope } = useFacultyScope()
  const [suggestedName, setSuggestedName] = useState("")
  const [description, setDescription] = useState("")
  const [draft, setDraft] = useState<CustomQuestionTypeDraft | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleGenerate() {
    if (!scope) return
    if (description.trim().length < 20) {
      AppAlert.alert("More detail needed", "Describe how students answer, how it is graded, and what fields instructors need.")
      return
    }
    setGenerating(true)
    try {
      const res = await instructorApi.generateCustomQuestionTypeSchema(scope, {
        description,
        suggestedName: suggestedName.trim() || undefined,
      })
      setDraft(res.draft)
    } catch (err) {
      AppAlert.alert("Generation failed", err instanceof ApiError ? err.message : "Could not generate type schema.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!scope || !draft) return
    const err = validateCustomQuestionTypeDraft(draft)
    if (err) {
      AppAlert.alert("Check type", err)
      return
    }
    setSaving(true)
    try {
      const res = await instructorApi.createCustomQuestionType(scope, draft)
      onSaved(res.type)
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Could not save question type.")
    } finally {
      setSaving(false)
    }
  }

  if (!draft) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Ionicons name="sparkles-outline" size={20} color={FACULTY_QUESTION_BANK_COLOR.link} />
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Create a new question type</Text>
        </View>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          Describe the format to AI — it builds the schema and saves it as a reusable template.
        </Text>
        <FacultySheetField label="Type name (optional)">
          <FacultySheetTextInput
            value={suggestedName}
            onChangeText={setSuggestedName}
            placeholder="e.g. Diagram labeling"
          />
        </FacultySheetField>
        <FacultySheetField label="Describe the question format">
          <FacultySheetTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Students label parts of a circuit diagram. Instructor provides image + rubric..."
            multiline
          />
        </FacultySheetField>
        <AppButton
          label={generating ? "Generating…" : "Generate schema"}
          onPress={() => void handleGenerate()}
          variant="primary"
          loading={generating}
          icon="sparkles-outline"
        />
        <AppButton label="Back to types" onPress={onCancel} variant="secondary" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <Text style={[type.bodyEmphasis, { color: native.label }]}>Review type schema</Text>
      <FacultySheetField label="Type name">
        <FacultySheetTextInput
          value={draft.label}
          onChangeText={(text) => setDraft({ ...draft, label: text })}
        />
      </FacultySheetField>
      <FacultySheetField label="Description">
        <FacultySheetTextInput
          value={draft.description}
          onChangeText={(text) => setDraft({ ...draft, description: text })}
          multiline
        />
      </FacultySheetField>
      <FacultySheetField label="Type ID">
        <FacultySheetTextInput
          value={draft.typeId}
          onChangeText={(text) => setDraft({ ...draft, typeId: text })}
        />
      </FacultySheetField>
      <Text style={[type.caption, { color: native.secondaryLabel }]}>
        {draft.schema.fields.length} field(s) · {draft.category}
      </Text>
      <AppButton label="Save question type" onPress={() => void handleSave()} variant="primary" loading={saving} />
      <AppButton label="Start over" onPress={() => setDraft(null)} variant="secondary" />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
})
