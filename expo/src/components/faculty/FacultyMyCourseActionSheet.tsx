import { useMemo, useState } from "react"
import { ScrollView, Text } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { FACULTY_ADMIN_COLOR, facultyAdminCourseThumb } from "../../lib/faculty-admin-theme"
import type { FacultyCourseOfferingRow } from "../../lib/faculty-my-courses-utils"
import { instructorApi } from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { hasFacultyNavAccess } from "../../constants/faculty-nav"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetContainer,
  FacultySheetErrorBanner,
  FacultySheetHero,
  FacultySheetModal,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  useCollabSheetStyles,
} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC, SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  visible: boolean
  course: FacultyCourseOfferingRow | null
  instructorId: number | null
  activeSelected: boolean
  onClose: () => void
  onSelectCourse: (course: FacultyCourseOfferingRow) => Promise<void>
  onRemoved: () => void
}

export function FacultyMyCourseActionSheet({
  visible,
  course,
  instructorId,
  activeSelected,
  onClose,
  onSelectCourse,
  onRemoved,
}: Props) {
  const router = useRouter()
  const { membershipTier, membershipTierLoaded } = useFacultyShell()
  const canManageTas = membershipTierLoaded && hasFacultyNavAccess(membershipTier, "Enterprise")
  const collabSheetStyles = useCollabSheetStyles()
  const { native, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [acting, setActing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState("")

  const thumb = useMemo(
    () => (course ? facultyAdminCourseThumb(course.course_id) : facultyAdminCourseThumb(0)),
    [course],
  )

  async function navigateAfterSelect(route: string) {
    if (!course) return
    setActing(true)
    setError("")
    try {
      await onSelectCourse(course)
      onClose()
      router.push(route as never)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not switch course.")
    } finally {
      setActing(false)
    }
  }

  async function handleUseActive() {
    if (!course || activeSelected) {
      onClose()
      return
    }
    setActing(true)
    setError("")
    try {
      await onSelectCourse(course)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not set active course.")
    } finally {
      setActing(false)
    }
  }

  async function handleRemoveFromTerm() {
    if (!course || !instructorId || !course.academic_term_id) return
    setActing(true)
    setError("")
    try {
      await instructorApi.removeCourseFromTerm(instructorId, course.academic_term_id, course.course_id)
      setConfirmRemove(false)
      onClose()
      onRemoved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove course from term.")
    } finally {
      setActing(false)
    }
  }

  if (!course) return null

  const termLabel = course.term_label ?? course.semester
  const canRemove = Boolean(course.academic_term_id)

  return (
    <FacultySheetModal visible={visible} onRequestClose={onClose} layout="glassBottom">
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Course" onClose={onClose} accentColor={FACULTY_ADMIN_COLOR.link} pageSheet />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={course.course_title}
            subtitle={course.course_code}
            icon="school-outline"
            thumbColor={thumb.fill}
            pills={activeSelected ? <FacultyStatusPill label="Active course" tone="live" /> : undefined}
          />

          <FacultySheetStatRow>
            {termLabel ? (
              <FacultySheetStatChip
                icon="calendar-outline"
                label="Term"
                value={termLabel}
                tone={SHEET_METRIC.info}
              />
            ) : null}
            {course.university ? (
              <FacultySheetStatChip
                icon="business-outline"
                label="University"
                value={course.university}
                tone={SHEET_METRIC.secondary}
              />
            ) : null}
          </FacultySheetStatRow>

          {course.description?.trim() ? (
            <FacultySheetSection label="Description" tone={SHEET_SECTION.highlight}>
              <Text style={[type.secondary, { color: native.secondaryLabel, lineHeight: 20 }]}>
                {course.description.trim()}
              </Text>
            </FacultySheetSection>
          ) : null}

          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetSection label="Actions" tone={SHEET_SECTION.tools}>
            {!activeSelected ? (
              <FacultySheetActionRow
                icon="checkmark-circle-outline"
                label="Use as active course"
                subtitle="Switch dashboard and modules to this course"
                tone="primary"
                loading={acting}
                onPress={() => void handleUseActive()}
              />
            ) : null}
            <FacultySheetActionRow
              icon="options-outline"
              label="Course settings"
              subtitle="Roster defaults, grading, and module options"
              onPress={() => void navigateAfterSelect("/module/course-settings")}
            />
            <FacultySheetActionRow
              icon="calendar-outline"
              label="Academic terms"
              subtitle="Manage terms, sections, and offerings"
              onPress={() => void navigateAfterSelect("/module/academic-terms")}
            />
            {canManageTas ? (
              <FacultySheetActionRow
                icon="person-add-outline"
                label="Teaching assistants"
                subtitle="Invite and manage TAs for this course"
                onPress={() => void navigateAfterSelect("/module/teaching-assistants")}
              />
            ) : null}
            {canRemove ? (
              <FacultySheetActionRow
                icon="trash-outline"
                label="Remove from term"
                subtitle={`Unlinks this offering from ${termLabel ?? "the term"}`}
                tone="danger"
                onPress={() => setConfirmRemove(true)}
              />
            ) : null}
          </FacultySheetSection>
        </ScrollView>

        {confirmRemove ? (
          <FacultySheetConfirm
            title="Remove from term?"
            body={`${course.course_code} will be removed from ${termLabel ?? "this term"}. The course record is kept; you can re-add it from Academic terms.`}
            confirmLabel="Remove"
            onCancel={() => setConfirmRemove(false)}
            onConfirm={() => void handleRemoveFromTerm()}
          />
        ) : null}
      </FacultySheetContainer>
    </FacultySheetModal>
  )
}
