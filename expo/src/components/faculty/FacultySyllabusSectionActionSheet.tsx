import { useEffect, useMemo, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SyllabusSection } from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  getSyllabusFieldEntries,
  getSyllabusFieldEntriesForEdit,
  getSyllabusSectionDisplayTitle,
  getSyllabusVisibleContent,
  syllabusHasRenderableContent,
  type SyllabusSection as DisplaySyllabusSection} from "../../lib/syllabus"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  useSheetPlaceholderColor,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetField,
  FacultySheetHero,
  FacultySheetSaveChip,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetToggleRow} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC, SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  visible: boolean
  section: SyllabusSection | null
  onClose: () => void
  onEdit: (section: SyllabusSection) => void
  onUpdate: (section: SyllabusSection) => void
  onToggleVisibility: (sectionId: string) => void
  onDelete: (section: SyllabusSection) => void
}

function sectionIcon(sectionId: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    "course-header": "school-outline",
    "instructor-info": "person-circle-outline",
    "general-course-info": "calendar-outline",
    "objectives-outcomes": "flag-outline",
    "required-materials": "book-outline",
    "schedule-assessments": "clipboard-outline",
    "exam-quiz-schedule": "time-outline",
    "lecture-topics": "chatbubbles-outline",
    grading: "pie-chart-outline",
    "course-policies": "shield-checkmark-outline",
    "university-policies": "business-outline"}
  return icons[sectionId] ?? "document-text-outline"
}

function sectionTypeLabel(section: SyllabusSection): string {
  if (section.content.fields && Object.keys(section.content.fields).length) return "Fields"
  if (section.content.items?.length) return "List"
  if (section.content.tables?.length || section.content.columns?.length) return "Table"
  if ("markdown" in section.content) return "Text"
  return section.type || "Section"
}

export function FacultySyllabusSectionActionSheet({
  visible,
  section,
  onClose,
  onEdit,
  onUpdate,
  onToggleVisibility,
  onDelete}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, type } = useModuleTheme()
  const placeholderColor = useSheetPlaceholderColor()
  const insets = useSafeAreaInsets()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draftFields, setDraftFields] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  const displaySection = section as DisplaySyllabusSection | null

  const displayTitle = useMemo(
    () => (displaySection ? getSyllabusSectionDisplayTitle(displaySection) : ""),
    [displaySection],
  )

  const fieldEntries = useMemo(
    () => (displaySection ? getSyllabusFieldEntriesForEdit(displaySection) : []),
    [displaySection],
  )

  const previewFields = useMemo(
    () => (displaySection ? getSyllabusFieldEntries(displaySection) : []),
    [displaySection],
  )

  const visibleContent = useMemo(
    () => (displaySection ? getSyllabusVisibleContent(displaySection) : null),
    [displaySection],
  )

  const hasFields = fieldEntries.length > 0
  const hasQuickEdit = hasFields

  useEffect(() => {
    if (!visible || !section) {
      setConfirmDelete(false)
      setDirty(false)
      setDraftFields({})
      return
    }
    const entries = getSyllabusFieldEntriesForEdit(section as DisplaySyllabusSection)
    setDraftFields(Object.fromEntries(entries))
    setDirty(false)
  }, [visible, section])

  if (!section) return null

  const contentCount = (() => {
    if (hasFields) return String(previewFields.length || fieldEntries.length)
    if (visibleContent?.items.length) return String(visibleContent.items.length)
    if (visibleContent?.markdownBlocks.length) return "1"
    if (visibleContent?.tables.length || visibleContent?.legacyTable) {
      return String((visibleContent.tables.length || 0) + (visibleContent.legacyTable ? 1 : 0))
    }
    return "0"
  })()

  const contentLabel = hasFields
    ? "Fields"
    : visibleContent?.items.length
      ? "Items"
      : visibleContent?.tables.length || visibleContent?.legacyTable
        ? "Tables"
        : "Blocks"

  function updateDraftField(label: string, value: string) {
    setDraftFields((prev) => ({ ...prev, [label]: value }))
    setDirty(true)
  }

  function saveQuickEdits() {
    if (!section || !hasQuickEdit) return
    onUpdate({
      ...section,
      content: {
        ...section.content,
        fields: { ...(section.content.fields ?? {}), ...draftFields }}})
    setDirty(false)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Syllabus section" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={displayTitle}
            icon={sectionIcon(section.sectionId)}
            pills={
              <>
                <FacultyStatusPill
                  label={section.isVisible ? "Visible" : "Hidden"}
                  tone={section.isVisible ? "success" : "neutral"}
                />
                <FacultyStatusPill label={section.isRequired ? "Required" : "Optional"} tone="neutral" />
                {section.sectionId.startsWith("custom-") ? (
                  <FacultyStatusPill label="Custom" tone="neutral" />
                ) : null}
              </>
            }
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip icon="layers-outline" label="Order" value={`#${section.order}`} tone={SHEET_METRIC.neutral} />
            <FacultySheetStatChip icon="shapes-outline" label="Type" value={sectionTypeLabel(section)} tone={SHEET_METRIC.info} />
            <FacultySheetStatChip icon="reader-outline" label={contentLabel} value={contentCount} tone={SHEET_METRIC.primary} />
          </FacultySheetStatRow>

          {hasQuickEdit ? (
            <FacultySheetSection
              label="Quick edit"
              tone={SHEET_SECTION.edit}
              action={dirty ? <FacultySheetSaveChip onPress={saveQuickEdits} /> : null}
            >
              {fieldEntries.map(([label]) => (
                <FacultySheetField key={label} label={label}>
                  <TextInput
                    style={collabSheetStyles.fieldInput}
                    value={draftFields[label] ?? ""}
                    onChangeText={(value) => updateDraftField(label, value)}
                    multiline={label.length > 22}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor={placeholderColor}
                  />
                </FacultySheetField>
              ))}
            </FacultySheetSection>
          ) : visibleContent && syllabusHasRenderableContent(visibleContent) ? (
            <FacultySheetSection label="Preview">
              {visibleContent.fieldEntries.map(([label, value]) => (
                <View key={label} style={localStyles.previewRow}>
                  <Text style={[type.caption, { color: native.tertiaryLabel }]}>{label}</Text>
                  <Text style={[type.bodyEmphasis, { color: native.label, lineHeight: 21 }]}>{value}</Text>
                </View>
              ))}
              {visibleContent.items.map((item, index) => (
                <View key={index} style={localStyles.previewBulletRow}>
                  <View style={[localStyles.previewBullet, { backgroundColor: native.secondaryLabel }]} />
                  <Text style={[type.bodyEmphasis, { color: native.label, lineHeight: 21 }]}>{item}</Text>
                </View>
              ))}
              {visibleContent.markdownBlocks.slice(0, 2).map((block, index) => (
                <Text key={index} style={[type.caption, { color: native.secondaryLabel, lineHeight: 21 }]} numberOfLines={4}>
                  {block}
                </Text>
              ))}
              {visibleContent.tables.length || visibleContent.legacyTable ? (
                <View
                  style={[
                    localStyles.tableHint,
                    { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                  ]}
                >
                  <Ionicons name="grid-outline" size={16} color={native.secondaryLabel} />
                  <Text style={[type.caption, { flex: 1, color: native.label, fontWeight: "600" }]}>
                    {visibleContent.tables.length + (visibleContent.legacyTable ? 1 : 0)} table
                    {visibleContent.tables.length + (visibleContent.legacyTable ? 1 : 0) === 1 ? "" : "s"} — use full editor to change cells
                  </Text>
                </View>
              ) : null}
            </FacultySheetSection>
          ) : (
            <View
              style={[
                localStyles.emptyPreview,
                { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
              ]}
            >
              <Ionicons name="create-outline" size={22} color={native.tertiaryLabel} />
              <Text style={collabSheetStyles.emptyText}>No content yet. Add details below.</Text>
            </View>
          )}

          <FacultySheetSection label="Visibility" tone={SHEET_SECTION.workflow}>
            <FacultySheetToggleRow
              icon={section.isVisible ? "eye-outline" : "eye-off-outline"}
              title={section.isVisible ? "Shown to students" : "Hidden from students"}
              subtitle={
                section.isVisible
                  ? "Students see this in the syllabus accordion."
                  : "Only instructors see this section while hidden."
              }
              value={section.isVisible}
              onValueChange={() => onToggleVisibility(section.sectionId)}
            />
          </FacultySheetSection>

          <FacultySheetSection label="Actions">
            <FacultySheetActionRow
              icon="create-outline"
              label="Full editor"
              subtitle="Lists, markdown, tables, and advanced edits"
              tone="primary"
              onPress={() => onEdit(section)}
            />
            {!section.isRequired ? (
              <FacultySheetActionRow
                icon="trash-outline"
                label="Delete section"
                subtitle="Removed after you save draft or publish"
                tone="danger"
                onPress={() => setConfirmDelete(true)}
              />
            ) : null}
          </FacultySheetSection>
        </ScrollView>

        {confirmDelete ? (
          <FacultySheetConfirm
            title="Delete section?"
            body={`“${displayTitle}” will be removed from this syllabus. Save draft or publish to persist the change.`}
            confirmLabel="Delete"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false)
              onDelete(section)
            }}
          />
        ) : null}
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  previewRow: { gap: 4 },
  previewBulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  previewBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginTop: 7,
  },
  tableHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyPreview: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
})