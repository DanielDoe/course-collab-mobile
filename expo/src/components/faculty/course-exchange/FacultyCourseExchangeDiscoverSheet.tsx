import { useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES,
  EXCHANGE_DESTINATION_SHELL_NOTE,
  EXCHANGE_PARTIAL_MODULES_NOTE,
  type CourseExchangeModule,
  type DestinationCourseRow,
  type DiscoverableCourse,
  type ExchangeSessionRow,
  discoverRelationshipLabel,
  exchangeRequestStatusColor,
} from "../../../lib/course-exchange-shared"
import {
  FACULTY_COURSE_EXCHANGE_COLOR,
  facultyCourseExchangeDiscoverThumb,
} from "../../../lib/faculty-course-exchange-theme"
import {
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetHero,
  FacultySheetModal,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  useCollabSheetStyles,
  useSheetPlaceholderColor,
} from "../faculty-collab-sheet-ui"
import { FacultyCourseExchangeModulePicker } from "./FacultyCourseExchangeModulePicker"
import { FacultyStatusPill } from "../faculty-shared"
import { SHEET_METRIC, SHEET_SECTION } from "../faculty-sheet-semantics"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { AppButton } from "../../theme/AppButton"

type Props = {
  visible: boolean
  course: DiscoverableCourse | null
  destinationCourses: DestinationCourseRow[]
  sessions: ExchangeSessionRow[]
  preferredDestinationCourseId?: number | null
  loading: boolean
  onClose: () => void
  onConfigure?: () => void
  onReviewRequest?: () => void
  onSubmit: (payload: {
    modules: CourseExchangeModule[]
    purpose: string
    destinationCourseId: number
    destinationSessionId?: number | null
  }) => Promise<void>
}

export function FacultyCourseExchangeDiscoverSheet({
  visible,
  course,
  destinationCourses,
  sessions,
  preferredDestinationCourseId,
  loading,
  onClose,
  onConfigure,
  onReviewRequest,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()
  const collabSheetStyles = useCollabSheetStyles()
  const placeholder = useSheetPlaceholderColor()

  const allowed = useMemo(
    () =>
      course?.shareableModules?.length
        ? course.shareableModules
        : [...COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES],
    [course],
  )

  const [step, setStep] = useState<"details" | "request">("details")
  const [selected, setSelected] = useState<CourseExchangeModule[]>([])
  const [purpose, setPurpose] = useState("")
  const [destinationCourseId, setDestinationCourseId] = useState<number | null>(null)
  const [destinationSessionId, setDestinationSessionId] = useState<number | null>(null)

  const filteredSessions = useMemo(() => {
    if (!destinationCourseId) return []
    return sessions.filter((s) => s.course_id === destinationCourseId)
  }, [destinationCourseId, sessions])

  useEffect(() => {
    if (visible && course) {
      setStep("details")
      setSelected([...allowed])
      setPurpose("")
      setDestinationCourseId(null)
      setDestinationSessionId(null)
    }
  }, [visible, course, allowed])

  useEffect(() => {
    if (!visible || step !== "request") return
    const preferred = preferredDestinationCourseId ?? destinationCourses[0]?.course_id ?? null
    if (preferred != null) setDestinationCourseId(preferred)
  }, [visible, step, preferredDestinationCourseId, destinationCourses])

  if (!course) return null

  const title = course.discoverableTitle || course.courseTitle
  const rel = course.relationship
  const relLabel = rel && rel.kind !== "none" ? discoverRelationshipLabel(rel.kind) : undefined
  const thumb = facultyCourseExchangeDiscoverThumb(course.courseId)
  const about = course.discoverableDescription || course.description
  const canRequest = !course.isOwner && (!rel || rel.kind === "none" || rel.kind === "rejected" || rel.kind === "cancelled")
  const canReview = Boolean(rel?.requestId && rel.kind !== "none")

  async function handleSubmit() {
    if (!destinationCourseId || selected.length === 0) return
    await onSubmit({
      modules: selected,
      purpose,
      destinationCourseId,
      destinationSessionId,
    })
  }

  return (
    <FacultySheetModal visible={visible} onRequestClose={onClose}>
      <FacultySheetChrome
        topInset={insets.top}
        title={step === "details" ? "Course details" : "Request modules"}
        subtitle={`${course.courseCode}${course.autoApprove ? " · Instant import" : " · Creator review"}`}
        onClose={onClose}
        accentColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
      />
      <ScrollView
        contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {step === "details" ? (
          <>
            <FacultySheetHero
              title={title}
              subtitle={[course.instructorName, course.university].filter(Boolean).join(" · ")}
              icon="school-outline"
              thumbColor={thumb.fill}
              pills={
                <>
                  {course.isOwner ? <FacultyStatusPill label="Your course" tone="neutral" /> : null}
                  {relLabel ? (
                    <FacultyStatusPill
                      label={relLabel}
                      tone={
                        exchangeRequestStatusColor(rel?.status ?? "PENDING") === "success"
                          ? "success"
                          : exchangeRequestStatusColor(rel?.status ?? "PENDING") === "danger"
                            ? "danger"
                            : exchangeRequestStatusColor(rel?.status ?? "PENDING") === "warning"
                              ? "warning"
                              : "neutral"
                      }
                    />
                  ) : null}
                  {course.autoApprove && !course.isOwner ? (
                    <FacultyStatusPill label="Instant import" tone="live" />
                  ) : null}
                </>
              }
            />

            <FacultySheetStatRow>
              <FacultySheetStatChip
                icon="albums-outline"
                label="Modules"
                value={String(allowed.length)}
                tone={SHEET_METRIC.primary}
              />
              {course.semester ? (
                <FacultySheetStatChip
                  icon="calendar-outline"
                  label="Term"
                  value={course.semester}
                  tone={SHEET_METRIC.info}
                />
              ) : null}
            </FacultySheetStatRow>

            <FacultySheetSection label="Creator" tone={SHEET_SECTION.review}>
              <Text style={[type.body, { color: native.label }]}>{course.instructorName}</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                {[course.instructorInstitution, course.instructorDepartment, course.university]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </FacultySheetSection>

            {about ? (
              <FacultySheetSection label="About" tone={SHEET_SECTION.highlight}>
                <Text style={[type.secondary, { color: native.secondaryLabel, lineHeight: 20 }]}>{about}</Text>
              </FacultySheetSection>
            ) : null}

            {course.isOwner ? (
              <FacultySheetNotice message="This is your shared course. Configure which modules other instructors can request." />
            ) : (
              <FacultySheetNotice message={EXCHANGE_PARTIAL_MODULES_NOTE} />
            )}

            <FacultySheetSection label="Actions" tone={SHEET_SECTION.tools}>
              {course.isOwner && onConfigure ? (
                <FacultySheetActionRow
                  icon="options-outline"
                  label="Configure sharing"
                  subtitle="Choose discoverability, modules, and auto-approve"
                  tone="primary"
                  onPress={onConfigure}
                />
              ) : null}
              {canReview && onReviewRequest ? (
                <FacultySheetActionRow
                  icon="document-text-outline"
                  label="Review request"
                  subtitle={relLabel || "Open the existing exchange request"}
                  onPress={onReviewRequest}
                />
              ) : null}
              {canRequest ? (
                <FacultySheetActionRow
                  icon={course.autoApprove ? "download-outline" : "send-outline"}
                  label={course.autoApprove ? "Import modules" : "Request modules"}
                  subtitle={
                    course.autoApprove
                      ? "Copy enabled modules into your course now"
                      : "Ask the creator to approve the modules you need"
                  }
                  tone="primary"
                  onPress={() => setStep("request")}
                />
              ) : null}
            </FacultySheetSection>
          </>
        ) : (
          <>
            <FacultySheetSection label="Select teaching modules">
              <FacultyCourseExchangeModulePicker
                allowed={allowed}
                selected={selected}
                onChange={setSelected}
                defaults={COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES}
              />
            </FacultySheetSection>
            <FacultySheetField label="Purpose (optional)">
              <TextInput
                value={purpose}
                onChangeText={setPurpose}
                placeholder="How you'll use these materials this term"
                placeholderTextColor={placeholder}
                multiline
                style={[collabSheetStyles.fieldInput, { color: native.label, minHeight: 80 }]}
              />
            </FacultySheetField>
            <FacultySheetSection label="Import into your course">
              <FacultySheetNotice message={EXCHANGE_DESTINATION_SHELL_NOTE} />
              <View style={styles.courseList}>
                {destinationCourses.map((c) => {
                  const active = destinationCourseId === c.course_id
                  return (
                    <Pressable
                      key={c.course_id}
                      onPress={() => {
                        setDestinationCourseId(c.course_id)
                        setDestinationSessionId(null)
                      }}
                      style={[
                        styles.courseRow,
                        {
                          borderColor: active ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.separator,
                          backgroundColor: active ? `${FACULTY_COURSE_EXCHANGE_COLOR.action}12` : native.fill,
                        },
                      ]}
                    >
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={active ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.tertiaryLabel}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[type.bodyEmphasis, { color: native.label }]}>{c.course_code}</Text>
                        <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                          {c.course_title}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </FacultySheetSection>

            {filteredSessions.length > 0 ? (
              <FacultySheetSection label="Destination section (optional)">
                <View style={styles.courseList}>
                  <Pressable
                    onPress={() => setDestinationSessionId(null)}
                    style={[
                      styles.courseRow,
                      {
                        borderColor:
                          destinationSessionId == null ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.separator,
                        backgroundColor:
                          destinationSessionId == null
                            ? `${FACULTY_COURSE_EXCHANGE_COLOR.action}12`
                            : native.fill,
                      },
                    ]}
                  >
                    <Text style={[type.body, { color: native.label }]}>No section mapping</Text>
                  </Pressable>
                  {filteredSessions.map((s) => {
                    const active = destinationSessionId === s.id
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setDestinationSessionId(s.id)}
                        style={[
                          styles.courseRow,
                          {
                            borderColor: active ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.separator,
                            backgroundColor: active ? `${FACULTY_COURSE_EXCHANGE_COLOR.action}12` : native.fill,
                          },
                        ]}
                      >
                        <Text style={[type.bodyEmphasis, { color: native.label }]}>{s.code}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </FacultySheetSection>
            ) : null}

            <View style={styles.footerActions}>
              <AppButton label="Back" variant="secondary" onPress={() => setStep("details")} />
              <AppButton
                label={course.autoApprove ? "Import now" : "Send request"}
                onPress={() => void handleSubmit()}
                disabled={loading || !destinationCourseId || selected.length === 0}
                loading={loading}
                backgroundColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
              />
            </View>
          </>
        )}
      </ScrollView>
    </FacultySheetModal>
  )
}

const styles = StyleSheet.create({
  courseList: { gap: 8, marginTop: 8 },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerActions: { flexDirection: "row", gap: 10, marginTop: 8 },
})
