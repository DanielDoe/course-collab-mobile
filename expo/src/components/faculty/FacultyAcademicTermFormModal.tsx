import { useEffect, useState } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  ACADEMIC_TERM_OPTIONS,
  academicTermSeasonVisual,
  defaultTermFormData,
  termFormFromRecord,
  type AcademicTermNameForm} from "../../lib/faculty-academic-term-utils"
import type { InstructorAcademicTerm } from "../../lib/instructor-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetSaveAction,
  FacultySheetSection,
  useSheetPlaceholderColor,

} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  visible: boolean
  mode: "add" | "edit"
  initial?: InstructorAcademicTerm | null
  submitting: boolean
  onClose: () => void
  onSubmit: (form: AcademicTermNameForm) => void
}

export function FacultyAcademicTermFormModal({
  visible,
  mode,
  initial,
  submitting,
  onClose,
  onSubmit}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const placeholderColor = useSheetPlaceholderColor()
  const insets = useSafeAreaInsets()
  const [form, setForm] = useState<AcademicTermNameForm>(defaultTermFormData())

  useEffect(() => {
    if (!visible) return
    setForm(initial ? termFormFromRecord(initial) : defaultTermFormData())
  }, [visible, initial])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title={mode === "add" ? "Add academic term" : "Edit academic term"}
          onClose={onClose}
          rightSlot={
            <FacultySheetSaveAction
              label={mode === "add" ? "Create" : "Save"}
              saving={submitting}
              onPress={() => onSubmit(form)}
            />
          }
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetSection label="Term details" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Year">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={form.year}
                onChangeText={(year) => setForm((prev) => ({ ...prev, year }))}
                keyboardType="number-pad"
                placeholder="2026"
                placeholderTextColor={placeholderColor}
              />
            </FacultySheetField>

            <FacultySheetField label="Term">
              <View style={styles.termRow}>
                {ACADEMIC_TERM_OPTIONS.map((term) => {
                  const season = academicTermSeasonVisual(term)
                  const active = form.term === term
                  return (
                    <Pressable
                      key={term}
                      style={[
                        styles.termChip,
                        {
                          borderColor: active ? season.accent : tokens.border,
                          backgroundColor: active ? semanticSoft(season.accent, tokens.isDark) : native.fill,
                        },
                      ]}
                      onPress={() => setForm((prev) => ({ ...prev, term }))}
                    >
                      <View style={[styles.termChipIcon, { backgroundColor: season.thumb.fill }]}>
                        <Ionicons name={season.icon} size={14} color={season.thumb.icon} />
                      </View>
                      <Text
                        style={[
                          type.bodyEmphasis,
                          { fontSize: 14, color: active ? season.accent : native.secondaryLabel },
                        ]}
                      >
                        {term}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </FacultySheetField>

            <FacultySheetField label="Start date">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={form.start_date}
                onChangeText={(start_date) => setForm((prev) => ({ ...prev, start_date }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
              />
            </FacultySheetField>

            <FacultySheetField label="End date">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={form.end_date}
                onChangeText={(end_date) => setForm((prev) => ({ ...prev, end_date }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
              />
            </FacultySheetField>
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

type SectionFormProps = {
  visible: boolean
  mode: "add" | "edit"
  initialCode?: string
  initialDescription?: string
  submitting: boolean
  onClose: () => void
  onSubmit: (payload: { code: string; description: string }) => void
}

export function FacultySectionFormModal({
  visible,
  mode,
  initialCode = "",
  initialDescription = "",
  submitting,
  onClose,
  onSubmit }: SectionFormProps) {
  const collabSheetStyles = useCollabSheetStyles()
  const placeholderColor = useSheetPlaceholderColor()
  const insets = useSafeAreaInsets()
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (!visible) return
    setCode(initialCode)
    setDescription(initialDescription)
  }, [visible, initialCode, initialDescription])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title={mode === "add" ? "Add section" : "Edit section"}
          onClose={onClose}
          rightSlot={
            <FacultySheetSaveAction
              label={mode === "add" ? "Create" : "Save"}
              saving={submitting}
              onPress={() => onSubmit({ code: code.trim(), description: description.trim() })}
            />
          }
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetSection label="Section details" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Section code">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={code}
                onChangeText={setCode}
                placeholder="e.g. P01"
                placeholderTextColor={placeholderColor}
                autoCapitalize="characters"
              />
            </FacultySheetField>

            <FacultySheetField label="Description">
              <TextInput
                style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={placeholderColor}
                multiline
              />
            </FacultySheetField>
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  termRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  termChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  termChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
})