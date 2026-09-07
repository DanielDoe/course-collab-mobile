import { useEffect, useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES,
  EXCHANGE_OWNER_SHARING_NOTE,
  type CourseExchangeModule,
  type CourseExchangeSharingMode,
  type MyCourseSharing,
} from "../../../lib/course-exchange-shared"
import { FACULTY_COURSE_EXCHANGE_COLOR, facultyCourseExchangeCourseThumb } from "../../../lib/faculty-course-exchange-theme"
import { FacultyCourseExchangeModulePicker } from "./FacultyCourseExchangeModulePicker"
import {
  FacultySheetChrome,
  FacultySheetHero,
  FacultySheetModal,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetToggleRow,
  useCollabSheetStyles,
  useFacultySheetSurfaces,
} from "../faculty-collab-sheet-ui"
import { FacultyStatusPill } from "../faculty-shared"
import { SHEET_SECTION } from "../faculty-sheet-semantics"
import { AppButton } from "../../theme/AppButton"

type Props = {
  visible: boolean
  course: MyCourseSharing | null
  saving: boolean
  onClose: () => void
  onSave: (payload: {
    courseId: number
    sharingMode: CourseExchangeSharingMode
    shareableModules: CourseExchangeModule[]
    autoApprove: boolean
    discoverableTitle?: string | null
  }) => Promise<void>
}

export function FacultyCourseExchangeShareSettingsSheet({
  visible,
  course,
  saving,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets()
  const surfaces = useFacultySheetSurfaces()
  const collabSheetStyles = useCollabSheetStyles()
  const [draftMode, setDraftMode] = useState<CourseExchangeSharingMode>("off")
  const [draftModules, setDraftModules] = useState<CourseExchangeModule[]>([
    ...COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES,
  ])
  const [draftAutoApprove, setDraftAutoApprove] = useState(false)

  useEffect(() => {
    if (!visible || !course) return
    setDraftMode(course.sharingMode)
    setDraftModules(
      course.shareableModules?.length ? [...course.shareableModules] : [...COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES],
    )
    setDraftAutoApprove(Boolean(course.autoApprove))
  }, [visible, course])

  if (!course) return null

  const isOn = course.sharingMode === "request_only"
  const thumb = facultyCourseExchangeCourseThumb(course.courseId)
  const discoverable = draftMode === "request_only"
  const canSave = !saving && (!discoverable || draftModules.length > 0)

  return (
    <FacultySheetModal visible={visible} onRequestClose={onClose} layout="glassBottom">
      <FacultySheetChrome
        topInset={insets.top}
        title="Share Course"
        subtitle={course.courseCode}
        onClose={onClose}
        accentColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
        pageSheet
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[collabSheetStyles.scroll, styles.scrollContent]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <FacultySheetHero
          title={course.courseTitle}
          subtitle={course.courseCode}
          icon="school-outline"
          thumbColor={thumb.fill}
          pills={
            <FacultyStatusPill
              label={discoverable ? "Discoverable" : isOn ? "Sharing" : "Not sharing"}
              tone={discoverable || isOn ? "live" : "neutral"}
            />
          }
        />

        <FacultySheetNotice message={EXCHANGE_OWNER_SHARING_NOTE} />

        <FacultySheetSection label="Sharing" tone={SHEET_SECTION.edit}>
          <View style={styles.toggleStack}>
            <FacultySheetToggleRow
              icon="globe-outline"
              title="Discoverable"
              subtitle="Other instructors can find and request this course"
              value={discoverable}
              onValueChange={(on) => setDraftMode(on ? "request_only" : "off")}
            />
            {discoverable ? (
              <FacultySheetToggleRow
                icon="flash-outline"
                title="Auto-approve requests"
                subtitle="Approved modules import without your review"
                value={draftAutoApprove}
                onValueChange={setDraftAutoApprove}
              />
            ) : null}
          </View>
        </FacultySheetSection>

        {discoverable ? (
          <FacultySheetSection
            label="Modules to share"
            hint="Requesters receive only the modules you enable."
            tone={SHEET_SECTION.review}
          >
            <FacultyCourseExchangeModulePicker
              selected={draftModules}
              onChange={setDraftModules}
              defaults={COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES}
            />
          </FacultySheetSection>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            borderTopColor: surfaces.cardBorder,
            backgroundColor: surfaces.rootBg,
          },
        ]}
      >
        <AppButton
          label="Save sharing settings"
          backgroundColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
          disabled={!canSave}
          loading={saving}
          onPress={() =>
            void onSave({
              courseId: course.courseId,
              sharingMode: draftMode,
              shareableModules: draftModules,
              autoApprove: draftAutoApprove,
              discoverableTitle: course.courseTitle,
            })
          }
        />
        <AppButton label="Cancel" variant="secondary" onPress={onClose} disabled={saving} />
      </View>
    </FacultySheetModal>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  toggleStack: { gap: 8 },
  footer: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
