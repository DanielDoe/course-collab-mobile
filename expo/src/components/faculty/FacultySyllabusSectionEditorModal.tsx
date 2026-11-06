import { useEffect, useMemo, useState } from "react"
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
import type { SyllabusSection as ApiSyllabusSection } from "../../lib/instructor-api"
import { FACULTY_BRAND } from "../../constants/faculty-theme"
import {
  getSyllabusFieldEntriesForEdit,
  getSyllabusSectionDisplayTitle,
  type SyllabusSection as DisplaySyllabusSection,
  type SyllabusTableBlock} from "../../lib/syllabus"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetAddButton,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetNotice,
  FacultySheetSaveAction,
  FacultySheetSection,
  FacultySheetToggleRow,
  FacultySheetTextInput,
  sheetPlaceholderColor
} from "./faculty-collab-sheet-ui"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { FacultySyllabusSectionDocumentPanel } from "./syllabus/FacultySyllabusSectionDocumentPanel"
import type { InstructorSyllabus } from "../../lib/instructor-api"

type Props = {
  visible: boolean
  section: ApiSyllabusSection | null
  onClose: () => void
  onSave: (section: ApiSyllabusSection) => void
  onSyllabusUpdated?: (syllabus: InstructorSyllabus) => void
}

function cloneSection(section: ApiSyllabusSection): ApiSyllabusSection {
  return JSON.parse(JSON.stringify(section)) as ApiSyllabusSection
}

function TableEditor({
  table,
  dangerColor,
  onChange}: {
  table: SyllabusTableBlock
  dangerColor: string
  onChange: (table: SyllabusTableBlock) => void
}) {
  const collabSheetStyles = useCollabSheetStyles()
  function updateCell(rowIndex: number, colIndex: number, value: string) {
    const rows = table.rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row,
    )
    onChange({ ...table, rows })
  }

  function updateColumn(colIndex: number, value: string) {
    const columns = table.columns.map((col, ci) => (ci === colIndex ? value : col))
    onChange({ ...table, columns })
  }

  function addRow() {
    onChange({ ...table, rows: [...table.rows, table.columns.map(() => "")] })
  }

  function removeRow(rowIndex: number) {
    onChange({ ...table, rows: table.rows.filter((_, i) => i !== rowIndex) })
  }

  return (
    <View style={localStyles.tableBlock}>
      <FacultySheetField label="Table title">
        <TextInput
          style={collabSheetStyles.fieldInput}
          value={table.title ?? ""}
          onChangeText={(title) => onChange({ ...table, title })}
          placeholder="Optional table title"
          placeholderTextColor={sheetPlaceholderColor}
        />
      </FacultySheetField>
      <FacultySheetField label="Columns">
        <View style={localStyles.tableRowHead}>
          {table.columns.map((col, ci) => (
            <TextInput
              key={`col-${ci}`}
              style={[collabSheetStyles.fieldInput, localStyles.tableCellInput]}
              value={col}
              onChangeText={(value) => updateColumn(ci, value)}
            />
          ))}
        </View>
      </FacultySheetField>
      {table.rows.map((row, ri) => (
        <View key={`row-${ri}`} style={localStyles.itemRow}>
          <View style={localStyles.tableRowHead}>
            {row.map((cell, ci) => (
              <TextInput
                key={`cell-${ri}-${ci}`}
                style={[collabSheetStyles.fieldInput, localStyles.tableCellInput]}
                value={cell}
                onChangeText={(value) => updateCell(ri, ci, value)}
              />
            ))}
          </View>
          <Pressable
            style={localStyles.iconBtn}
            hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
            onPress={() => removeRow(ri)}
          >
            <Ionicons name="trash-outline" size={18} color={dangerColor} />
          </Pressable>
        </View>
      ))}
      <FacultySheetAddButton label="Add row" onPress={addRow} />
    </View>
  )
}

export function FacultySyllabusSectionEditorModal({
  visible,
  section,
  onClose,
  onSave,
  onSyllabusUpdated,
}: Props) {
  useSuppressModuleSearchDock(visible)
  const collabSheetStyles = useCollabSheetStyles()
  const tokens = useAppThemeTokens()
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = useState<ApiSyllabusSection | null>(null)

  useEffect(() => {
    if (section && visible) setDraft(cloneSection(section))
    else setDraft(null)
  }, [section, visible])

  const displayTitle = useMemo(
    () => (draft ? getSyllabusSectionDisplayTitle(draft as DisplaySyllabusSection) : ""),
    [draft],
  )

  const fieldEntries = useMemo(
    () => (draft ? getSyllabusFieldEntriesForEdit(draft as DisplaySyllabusSection) : []),
    [draft],
  )

  if (!draft) return null

  const current = draft

  const hasFields = Boolean(current.content.fields && Object.keys(current.content.fields).length)
  const hasItems = current.content.items != null
  const hasMarkdown = "markdown" in current.content
  const hasLegacyTable = Boolean(current.content.columns?.length)
  const tables = current.content.tables ?? []

  function updateField(label: string, value: string) {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        content: {
          ...prev.content,
          fields: { ...(prev.content.fields ?? {}), [label]: value }}}
    })
  }

  function updateItem(index: number, value: string) {
    setDraft((prev) => {
      if (!prev) return prev
      const items = [...(prev.content.items ?? [])]
      items[index] = value
      return { ...prev, content: { ...prev.content, items } }
    })
  }

  function addItem() {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        content: { ...prev.content, items: [...(prev.content.items ?? []), ""] }}
    })
  }

  function removeItem(index: number) {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        content: {
          ...prev.content,
          items: (prev.content.items ?? []).filter((_, i) => i !== index)}}
    })
  }

  function updateTable(index: number, table: SyllabusTableBlock) {
    setDraft((prev) => {
      if (!prev) return prev
      const next = [...(prev.content.tables ?? [])]
      next[index] = table
      return { ...prev, content: { ...prev.content, tables: next } }
    })
  }

  function updateLegacyTable(columns: string[], rows: string[][]) {
    setDraft((prev) => (prev ? { ...prev, content: { ...prev.content, columns, rows } } : prev))
  }

  function handleSave() {
    onSave(current)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Edit section"
          onClose={onClose}
          rightSlot={<FacultySheetSaveAction label="Save" onPress={handleSave} />}
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          <FacultySheetSection label="Section settings" hint={displayTitle} tone={SHEET_SECTION.edit}>
            {!current.isRequired ? (
              <FacultySheetField label="Section title">
                <FacultySheetTextInput
                  value={current.title}
                  onChangeText={(title) => setDraft((prev) => (prev ? { ...prev, title } : prev))}
                  accessibilityLabel="Section title"
                  autoFocus={current.sectionId.startsWith("custom-") && !current.content.markdown}
                />
              </FacultySheetField>
            ) : (
              <FacultySheetNotice
                message={`Required template section — title shows as “${displayTitle}” to students.`}
              />
            )}
            <FacultySheetToggleRow
              icon="eye-outline"
              title="Visible to students"
              value={current.isVisible}
              onValueChange={(isVisible) => setDraft((prev) => (prev ? { ...prev, isVisible } : prev))}
            />
          </FacultySheetSection>

          {hasFields ? (
            <FacultySheetSection label="Fields" tone={SHEET_SECTION.review}>
              {(fieldEntries.length ? fieldEntries : Object.entries(current.content.fields ?? {})).map(
                ([label, value]) => (
                  <FacultySheetField key={label} label={label}>
                    <TextInput
                      style={[
                        collabSheetStyles.fieldInput,
                        label.length > 24 && collabSheetStyles.textArea,
                      ]}
                      value={value}
                      onChangeText={(next) => updateField(label, next)}
                      multiline={label.length > 24}
                      textAlignVertical={label.length > 24 ? "top" : "center"}
                      accessibilityLabel={label}
                    />
                  </FacultySheetField>
                ),
              )}
            </FacultySheetSection>
          ) : null}

          {hasItems ? (
            <FacultySheetSection
              label="List items"
              tone={SHEET_SECTION.edit}
              action={<FacultySheetAddButton label="Add item" onPress={addItem} />}
            >
              {(current.content.items ?? []).map((item, index) => (
                <View key={index} style={localStyles.itemRow}>
                  <TextInput
                    style={[collabSheetStyles.fieldInput, localStyles.flexInput]}
                    value={item}
                    onChangeText={(value) => updateItem(index, value)}
                    multiline
                    textAlignVertical="top"
                  />
                  <Pressable
                    style={localStyles.iconBtn}
                    hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
                    onPress={() => removeItem(index)}
                  >
                    <Ionicons name="trash-outline" size={18} color={tokens.danger} />
                  </Pressable>
                </View>
              ))}
            </FacultySheetSection>
          ) : null}

          {hasMarkdown ? (
            <FacultySheetSection label="Content" tone={SHEET_SECTION.review}>
              <TextInput
                style={[collabSheetStyles.fieldInput, collabSheetStyles.textAreaLg]}
                value={current.content.markdown ?? ""}
                onChangeText={(markdown) =>
                  setDraft((prev) =>
                    prev ? { ...prev, content: { ...prev.content, markdown } } : prev,
                  )
                }
                multiline
                placeholder="Section text (markdown supported)"
                placeholderTextColor={sheetPlaceholderColor}
                textAlignVertical="top"
                accessibilityLabel="Section text"
              />
            </FacultySheetSection>
          ) : null}

          {hasLegacyTable && current.content.columns ? (
            <FacultySheetSection label="Table" tone={SHEET_SECTION.tools}>
              <TableEditor
                table={{
                  columns: current.content.columns,
                  rows: current.content.rows ?? []}}
                dangerColor={tokens.danger}
                onChange={({ columns, rows }) => updateLegacyTable(columns, rows)}
              />
            </FacultySheetSection>
          ) : null}

          {tables.length ? (
            <FacultySheetSection label="Tables" tone={SHEET_SECTION.tools}>
              {tables.map((table, index) => (
                <TableEditor key={index} table={table} dangerColor={tokens.danger} onChange={(next) => updateTable(index, next)} />
              ))}
            </FacultySheetSection>
          ) : null}

          {current.sectionId === "curriculum-vitae" && onSyllabusUpdated ? (
            <FacultySheetSection label="Curriculum vitae" tone={SHEET_SECTION.tools}>
              <FacultySyllabusSectionDocumentPanel
                section={current}
                onSyllabusUpdated={(syllabus) => {
                  onSyllabusUpdated(syllabus)
                  const refreshed = syllabus.sections.find((s) => s.sectionId === current.sectionId)
                  if (refreshed) setDraft(cloneSection(refreshed))
                }}
              />
            </FacultySheetSection>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  tableBlock: { gap: 8, marginBottom: 8 },
  tableRowHead: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tableCellInput: { flex: 1, minWidth: 88, fontSize: 14, paddingVertical: 8 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  flexInput: { flex: 1 },
  iconBtn: { padding: 10, marginTop: 2 },
})