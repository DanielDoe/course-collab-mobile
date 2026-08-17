import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorSyllabus, type SyllabusSection } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useFacultyModuleStyles } from "../../lib/faculty-themed-ui"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  getSyllabusFieldEntries,
  getSyllabusSectionDisplayTitle,
  getSyllabusVisibleContent,
  syllabusHasRenderableContent,
} from "../../lib/syllabus"
import {
  COURSE_INFO_ACTION,
  COURSE_INFO_SYLLABUS_STATUS,
  courseInfoSyllabusThumb,
} from "../../lib/course-info-color-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyModuleScrollPadding, FacultySearchToolbar } from "./faculty-module-shell"
import { FacultySyllabusSectionEditorModal } from "./FacultySyllabusSectionEditorModal"
import { FacultySyllabusSectionActionSheet } from "./FacultySyllabusSectionActionSheet"
import { useSearchDockBottomInset } from "../../context/ModuleSearchDockContext"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

function sectionPreview(section: SyllabusSection): string {
  const visible = getSyllabusVisibleContent(section)
  if (syllabusHasRenderableContent(visible)) {
    if (visible.fieldEntries.length) {
      return visible.fieldEntries.map(([label, value]) => `${label}: ${value}`).join(" · ")
    }
    if (visible.items.length) return visible.items.join(" · ")
    if (visible.markdownBlocks.length) return visible.markdownBlocks[0]
    if (visible.tables.length || visible.legacyTable) return "Table content"
  }
  const fields = getSyllabusFieldEntries(section)
  if (fields.length) return fields.map(([label, value]) => `${label}: ${value}`).join(" · ")
  if (section.content.items?.length) return section.content.items.filter(Boolean).join(" · ")
  if (section.content.markdown?.trim()) return section.content.markdown.trim()
  return ""
}

function reorderSections(sections: SyllabusSection[]): SyllabusSection[] {
  return sections.map((section, index) => ({ ...section, order: index + 1 }))
}

function SyllabusStatusChip({
  label,
  colors,
}: {
  label: string
  colors: { bg: string; text: string }
}) {
  return (
    <View style={[localStyles.statusChip, { backgroundColor: colors.bg }]}>
      <Text style={[localStyles.statusChipText, { color: colors.text }]}>{label}</Text>
    </View>
  )
}

const FOOTER_BAR_HEIGHT = 132

export function FacultySyllabusScreen() {
  const insets = useSafeAreaInsets()
  const searchDockInset = useSearchDockBottomInset()
  const scrollPad = useFacultyModuleScrollPadding(24)
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const styles = useFacultyModuleStyles()
  const type = useNativeType()
  const { scope, ready } = useFacultyScope()

  const [syllabus, setSyllabus] = useState<InstructorSyllabus | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [selectedSection, setSelectedSection] = useState<SyllabusSection | null>(null)
  const [editorSection, setEditorSection] = useState<SyllabusSection | null>(null)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    if (!scope) return
    const data = await instructorApi.getSyllabus(scope)
    setSyllabus(data.syllabus)
    setCanEdit(data.canEdit ?? true)
  }, [scope])

  const courseId = scope?.courseId

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setSyllabus(null)
    setCanEdit(false)
    setSelectedSection(null)
    setEditorSection(null)
    setSearch("")
    setError("")
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load syllabus."))
      .finally(() => setLoading(false))
  }, [ready, load, courseId])

  const sections = useMemo(
    () => [...(syllabus?.sections ?? [])].sort((a, b) => a.order - b.order),
    [syllabus?.sections],
  )

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sections
    return sections.filter((section) => {
      const title = getSyllabusSectionDisplayTitle(section).toLowerCase()
      const preview = sectionPreview(section).toLowerCase()
      return title.includes(q) || preview.includes(q)
    })
  }, [sections, search])

  const listScrollPad = useMemo(
    () => ({
      ...scrollPad,
      paddingBottom:
        scrollPad.paddingBottom + (canEdit && syllabus ? FOOTER_BAR_HEIGHT + insets.bottom : 0),
    }),
    [scrollPad, canEdit, syllabus, insets.bottom],
  )

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }

  function updateSections(nextSections: SyllabusSection[]) {
    if (!syllabus) return
    setSyllabus({ ...syllabus, sections: reorderSections(nextSections) })
  }

  function replaceSection(updated: SyllabusSection) {
    if (!syllabus) return
    updateSections(syllabus.sections.map((s) => (s.sectionId === updated.sectionId ? updated : s)))
    setSelectedSection((current) => (current?.sectionId === updated.sectionId ? updated : current))
  }

  function applySectionUpdate(updated: SyllabusSection) {
    replaceSection(updated)
    setEditorSection(null)
    setSelectedSection(null)
  }

  function toggleVisibility(sectionId: string) {
    if (!syllabus || !canEdit) return
    updateSections(
      syllabus.sections.map((s) =>
        s.sectionId === sectionId ? { ...s, isVisible: !s.isVisible } : s,
      ),
    )
    setSelectedSection((current) =>
      current?.sectionId === sectionId ? { ...current, isVisible: !current.isVisible } : current,
    )
  }

  function deleteSection(section: SyllabusSection) {
    if (!syllabus || !canEdit || section.isRequired) return
    updateSections(syllabus.sections.filter((s) => s.sectionId !== section.sectionId))
    setSelectedSection(null)
  }

  function addSection() {
    if (!syllabus || !canEdit) return
    setSearch("")
    const id = `custom-${Date.now()}`
    const next: SyllabusSection = {
      sectionId: id,
      title: "Additional Section",
      order: syllabus.sections.length + 1,
      type: "text",
      content: { markdown: "" },
      isRequired: false,
      isVisible: true,
      isEditable: true,
    }
    updateSections([...syllabus.sections, next])
    setEditorSection(next)
  }

  async function save(action?: "publish") {
    if (!scope || !syllabus) return
    setSaving(true)
    setError("")
    try {
      const result = await instructorApi.saveSyllabus(scope, {
        title: syllabus.title,
        term: syllabus.term,
        contentMode: syllabus.contentMode,
        sections: reorderSections(syllabus.sections),
        action,
      })
      setSyllabus(result.syllabus)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save syllabus.")
    } finally {
      setSaving(false)
    }
  }

  if (!ready) {
    return (
      <FacultyEmptyState
        icon="document-text-outline"
        title="Select a course"
        body="Syllabus editing requires an active course."
      />
    )
  }

  return (
    <View style={styles.root}>
      <FacultySearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search syllabus sections…"
        showFilter={false}
        trailingAction={
          canEdit
            ? {
                onPress: addSection,
                accessibilityLabel: "Add syllabus section",
              }
            : undefined
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={COURSE_INFO_ACTION.fill} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color={COURSE_INFO_ACTION.fill} style={{ marginTop: 32 }} />
        ) : !syllabus ? (
          <FacultyEmptyState icon="document-text-outline" title="No syllabus" body="Could not load syllabus for this course." />
        ) : (
          <>
            <View style={styles.card}>
              <View style={localStyles.heroTop}>
                <Text style={[type.bodyEmphasis, localStyles.heroTitle]}>{syllabus.title}</Text>
                <SyllabusStatusChip
                  label={syllabus.status === "published" ? "Published" : "Draft"}
                  colors={
                    syllabus.status === "published"
                      ? COURSE_INFO_SYLLABUS_STATUS.published
                      : COURSE_INFO_SYLLABUS_STATUS.draft
                  }
                />
              </View>
              {syllabus.term ? <Text style={[type.caption, localStyles.heroTerm, { color: native.secondaryLabel }]}>{syllabus.term}</Text> : null}
              {syllabus.contentMode === "pdf" && syllabus.pdfUrl ? (
                <Text style={[type.caption, localStyles.pdfNote, { color: native.tertiaryLabel }]}>
                  PDF syllabus — structured sections still apply for in-app content.
                </Text>
              ) : null}
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {sections.length === 0 ? (
              <FacultyEmptyState
                icon="layers-outline"
                title="No sections"
                body={canEdit ? "Use + in the search bar to add your first syllabus section." : "No syllabus sections for this course."}
              />
            ) : filteredSections.length === 0 ? (
              <FacultyEmptyState
                icon="search-outline"
                title="No matches"
                body="Try another search term."
              />
            ) : (
              filteredSections.map((section, index) => {
                const preview = sectionPreview(section)
                const displayTitle = getSyllabusSectionDisplayTitle(section)
                const thumb = courseInfoSyllabusThumb(index)
                return (
                  <Pressable
                    key={section.sectionId}
                    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                    onPress={() => setSelectedSection(section)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      [
                        displayTitle,
                        !section.isVisible ? "Hidden" : null,
                        section.isRequired ? "Required" : null,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    }
                  >
                    <View style={localStyles.sectionRow}>
                      <SolidListThumbTile thumb={thumb} icon="document-text-outline" size="compact" />
                      <View style={localStyles.sectionCopy}>
                        <View style={localStyles.sectionTitleRow}>
                          <Text style={[type.bodyEmphasis, localStyles.sectionTitle, { color: native.label }]}>
                            {displayTitle}
                          </Text>
                          <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
                        </View>
                        <View style={localStyles.sectionBadges}>
                          {!section.isVisible ? (
                            <SyllabusStatusChip label="Hidden" colors={COURSE_INFO_SYLLABUS_STATUS.hidden} />
                          ) : null}
                          {section.isRequired ? (
                            <SyllabusStatusChip label="Required" colors={COURSE_INFO_SYLLABUS_STATUS.required} />
                          ) : null}
                          {!section.isRequired && section.sectionId.startsWith("custom-") ? (
                            <SyllabusStatusChip label="Custom" colors={COURSE_INFO_SYLLABUS_STATUS.custom} />
                          ) : null}
                        </View>
                        {preview ? (
                          <Text style={[type.caption, localStyles.sectionPreview, { color: native.secondaryLabel }]} numberOfLines={3}>
                            {preview}
                          </Text>
                        ) : (
                          <Text style={[type.caption, localStyles.sectionEmpty, { color: native.tertiaryLabel }]}>
                            {canEdit ? "Tap to edit content" : "Tap to view section"}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Pressable>
                )
              })
            )}
          </>
        )}
      </ScrollView>

      {syllabus && canEdit ? (
        <View
          style={[
            styles.footerBar,
            {
              paddingBottom: insets.bottom + 12,
              marginBottom: searchDockInset,
            },
          ]}
        >
          <Pressable
            style={[styles.footerBtn, styles.draftBtn]}
            disabled={saving}
            onPress={() => void save()}
            accessibilityRole="button"
            accessibilityLabel="Save draft"
          >
            <Text style={styles.footerBtnText}>{saving ? "Saving…" : "Save draft"}</Text>
          </Pressable>
          <Pressable
            style={[styles.footerBtn, localStyles.publishBtn]}
            disabled={saving}
            onPress={() => void save("publish")}
            accessibilityRole="button"
            accessibilityLabel="Publish syllabus"
          >
            <Ionicons name="cloud-upload-outline" size={18} color={COURSE_INFO_ACTION.ink} />
            <Text style={localStyles.publishBtnText}>Publish</Text>
          </Pressable>
        </View>
      ) : null}

      <FacultySyllabusSectionActionSheet
        visible={selectedSection != null}
        section={selectedSection}
        canEdit={canEdit}
        onClose={() => setSelectedSection(null)}
        onEdit={(section) => {
          setEditorSection(section)
          setSelectedSection(null)
        }}
        onUpdate={replaceSection}
        onToggleVisibility={toggleVisibility}
        onDelete={deleteSection}
      />

      <FacultySyllabusSectionEditorModal
        visible={editorSection != null}
        section={editorSection}
        onClose={() => setEditorSection(null)}
        onSave={applySectionUpdate}
      />
    </View>
  )
}

const localStyles = StyleSheet.create({
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  heroTitle: { flex: 1, fontSize: 20 },
  heroTerm: { fontWeight: "600" },
  pdfNote: { fontWeight: "600" },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sectionRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  sectionCopy: { flex: 1, minWidth: 0, gap: 6 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { flex: 1, fontSize: 16 },
  sectionBadges: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sectionPreview: { lineHeight: 20, fontWeight: "500" },
  sectionEmpty: { fontStyle: "italic" },
  publishBtn: {
    flex: 1,
    backgroundColor: COURSE_INFO_ACTION.fill,
    borderWidth: 0,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 21,
    color: COURSE_INFO_ACTION.ink,
  },
})
