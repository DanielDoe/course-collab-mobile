import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  academicTermLabel,
  academicTermSeasonVisual,
  canonicalSectionLabel,
  formatAcademicTermDateRange} from "../../lib/faculty-academic-term-utils"
import {
  instructorApi,
  type InstructorAcademicTerm,
  type InstructorSession} from "../../lib/instructor-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetErrorBanner,
  FacultySheetHero,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow
} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC, SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type ConfirmKind = "delete-term" | "delete-section" | null

type Props = {
  visible: boolean
  term: InstructorAcademicTerm | null
  scope: Scope | null
  courseCode?: string
  onClose: () => void
  onEditTerm: (term: InstructorAcademicTerm) => void
  onAddSection: (term: InstructorAcademicTerm) => void
  onEditSection: (term: InstructorAcademicTerm, session: InstructorSession) => void
  onUpdated: () => void
}

export function FacultyAcademicTermActionSheet({
  visible,
  term,
  scope,
  courseCode,
  onClose,
  onEditTerm,
  onAddSection,
  onEditSection,
  onUpdated}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const [sections, setSections] = useState<InstructorSession[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)
  const [pendingSection, setPendingSection] = useState<InstructorSession | null>(null)
  const [error, setError] = useState("")

  const loadSections = useCallback(async () => {
    if (!scope || !term) return
    setSectionsLoading(true)
    try {
      const data = await instructorApi.getSessions(scope, term.id)
      const filtered = (data.sessions ?? []).filter((s) => s.code.toUpperCase() !== "BETA")
      setSections(filtered)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sections.")
    } finally {
      setSectionsLoading(false)
    }
  }, [scope, term])

  useEffect(() => {
    if (!visible || !term) {
      setSections([])
      setConfirm(null)
      setPendingSection(null)
      setError("")
      return
    }
    void loadSections()
  }, [visible, term, loadSections])

  const dateRange = useMemo(
    () => (term ? formatAcademicTermDateRange(term.start_date, term.end_date) : null),
    [term],
  )

  async function handleSetActive() {
    if (!scope || !term || term.is_active) return
    setActing(true)
    setError("")
    try {
      await instructorApi.activateAcademicTerm(scope, term.id)
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not set active term.")
    } finally {
      setActing(false)
    }
  }

  async function handleDeleteTerm() {
    if (!scope || !term) return
    setActing(true)
    setError("")
    try {
      await instructorApi.deleteAcademicTerm(scope, term.id)
      setConfirm(null)
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete term.")
    } finally {
      setActing(false)
    }
  }

  async function handleDeleteSection() {
    if (!scope || !pendingSection) return
    setActing(true)
    setError("")
    try {
      await instructorApi.deleteSession(scope, pendingSection.id)
      setConfirm(null)
      setPendingSection(null)
      await loadSections()
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete section.")
    } finally {
      setActing(false)
    }
  }

  if (!term) return null

  const season = academicTermSeasonVisual(term)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Academic term" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={academicTermLabel(term)}
            subtitle={dateRange ?? undefined}
            icon={season.icon}
            thumbColor={season.accent}
            pills={term.is_active ? <FacultyStatusPill label="Active" tone="success" /> : null}
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip icon="book-outline" label="Sections" value={String(term.session_count ?? sections.length)} tone={SHEET_METRIC.info} />
            <FacultySheetStatChip icon="people-outline" label="Students" value={String(term.total_students ?? 0)} tone={SHEET_METRIC.people} />
            <FacultySheetStatChip icon="school-outline" label="Courses" value={String(term.course_count ?? term.courses?.length ?? 0)} tone={SHEET_METRIC.secondary} />
          </FacultySheetStatRow>

          {Array.isArray(term.courses) && term.courses.length > 0 ? (
            <FacultySheetSection label="Course offerings">
              <View style={localStyles.chipRow}>
                {term.courses.map((course) => (
                  <View
                    key={course.id}
                    style={[
                      localStyles.chip,
                      { backgroundColor: native.fill, borderColor: tokens.border },
                    ]}
                  >
                    <Text style={[type.caption, { fontWeight: "700", color: native.label }]} numberOfLines={1}>
                      {course.course_code}
                    </Text>
                  </View>
                ))}
              </View>
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="Sections for this course" hint={`${sections.length} linked`} tone={SHEET_SECTION.roster}>
            {sectionsLoading ? (
              <ActivityIndicator color={FACULTY_SHEET_COLOR.link} style={{ marginVertical: 16 }} />
            ) : sections.length === 0 ? (
              <View
                style={[
                  localStyles.emptySections,
                  { backgroundColor: native.fill, borderColor: tokens.border },
                ]}
              >
                <Ionicons name="folder-open-outline" size={22} color={native.secondaryLabel} />
                <Text style={[collabSheetStyles.emptyText, type.secondary]}>No sections linked to this term yet.</Text>
              </View>
            ) : (
              sections.map((session) => {
                const label =
                  courseCode && session.code.toUpperCase() !== "BETA"
                    ? canonicalSectionLabel(courseCode, session.code)
                    : session.code
                return (
                  <View
                    key={session.id}
                    style={[
                      localStyles.sectionRow,
                      { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
                    ]}
                  >
                    <Pressable
                      style={localStyles.sectionCopyPressable}
                      onPress={() => term && onEditSection(term, session)}
                    >
                      <View style={localStyles.sectionCopy}>
                        <Text style={[type.bodyEmphasis, { color: native.label, fontVariant: ["tabular-nums"] }]}>
                          {label}
                        </Text>
                        {session.description ? (
                          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                            {session.description}
                          </Text>
                        ) : null}
                        <Text style={[type.caption, { color: native.tertiaryLabel }]}>
                          {session.student_count ?? 0} students
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      style={localStyles.sectionDeleteBtn}
                      onPress={() => {
                        setPendingSection(session)
                        setConfirm("delete-section")
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={native.secondaryLabel} />
                    </Pressable>
                  </View>
                )
              })
            )}
          </FacultySheetSection>

          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetSection label="Actions" tone={SHEET_SECTION.tools}>
            {!term.is_active ? (
              <FacultySheetActionRow
                icon="checkmark-circle-outline"
                label="Set as active term"
                subtitle="Students and faculty will use this term by default"
                tone="primary"
                loading={acting}
                onPress={() => void handleSetActive()}
              />
            ) : null}
            <FacultySheetActionRow icon="create-outline" label="Edit term" onPress={() => onEditTerm(term)} />
            <FacultySheetActionRow
              icon="add-circle-outline"
              label="Add section"
              subtitle="Link a new section to this term"
              onPress={() => onAddSection(term)}
            />
            <FacultySheetActionRow
              icon="trash-outline"
              label="Delete term"
              subtitle="Permanently removes this academic term"
              tone="danger"
              onPress={() => setConfirm("delete-term")}
            />
          </FacultySheetSection>
        </ScrollView>

        {confirm ? (
          <FacultySheetConfirm
            title={confirm === "delete-term" ? "Delete academic term?" : "Delete section?"}
            body={
              confirm === "delete-term"
                ? `This permanently deletes ${academicTermLabel(term)}. Terms with sections cannot be deleted until sections are removed or reassigned.`
                : `This deletes section ${pendingSection?.code} and all ${pendingSection?.student_count ?? 0} enrolled student(s).`
            }
            confirmLabel="Delete"
            onCancel={() => {
              setConfirm(null)
              setPendingSection(null)
            }}
            onConfirm={() => void (confirm === "delete-term" ? handleDeleteTerm() : handleDeleteSection())}
          />
        ) : null}
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
  },
  emptySections: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  sectionCopyPressable: { flex: 1 },
  sectionCopy: { gap: 2 },
  sectionDeleteBtn: { padding: 4 },
})