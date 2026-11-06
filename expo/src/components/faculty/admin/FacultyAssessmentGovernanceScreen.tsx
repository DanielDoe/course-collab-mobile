import { useCallback, useEffect, useMemo, useState } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import {
  ASSESSMENT_PRIVILEGE_SOURCES,
  type AssessmentPrivilegeSource,
} from "../../../lib/assessment-governance"
import {
  DEFAULT_ASSESSMENT_PLATFORM_ACCESS,
  extractAssessmentPlatformAccess,
  type AssessmentPlatformAccess,
  type AssessmentPlatformKind,
} from "../../../lib/assessment-platform-access"
import { parseAssessmentPolicy } from "../../../lib/assessment-policy-settings"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminToggleRow,
  useAdminSaveState,
  useAdminStyles,
} from "../faculty-admin-ui"

const PLATFORM_KIND_ROWS: Array<{ kind: AssessmentPlatformKind; label: string }> = [
  { kind: "quiz", label: "Quizzes" },
  { kind: "homework", label: "Homework" },
  { kind: "mid_semester", label: "Mid-semester exams" },
  { kind: "final", label: "Final exams" },
]

const DEFAULT_PRIVILEGE_SOURCE: AssessmentPrivilegeSource = "instructor_only"
const DEFAULT_SHOW_POLICY_NOTICE = false

const PRIVILEGE_OPTIONS: Array<{
  value: AssessmentPrivilegeSource
  label: string
  subtitle: string
}> = [
  {
    value: "instructor_only",
    label: "Instructor controlled only",
    subtitle:
      "All assessment policies follow instructor settings. Membership perks cannot modify quiz attempts, homework attempts, retakes, extensions, late passes, or exam access.",
  },
  {
    value: "membership_enabled",
    label: "Membership enabled",
    subtitle:
      "Explorer and Trailblazer membership benefits may grant additional assessment opportunities (retakes, save-and-finish, rollovers) per platform rules.",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    subtitle:
      "Assessment opportunities may come from instructor settings, membership benefits, and Trade Center redemptions. Instructor may still configure limits on each assessment.",
  },
]

export function FacultyAssessmentGovernanceScreen() {
  return (
    <FacultyAdminCourseGate>
      <FacultyAssessmentGovernanceContent />
    </FacultyAdminCourseGate>
  )
}

function FacultyAssessmentGovernanceContent() {
  const { scope, ready } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, setError, clearError, runSave } =
    useAdminSaveState()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [privilegeSource, setPrivilegeSource] = useState<AssessmentPrivilegeSource>(DEFAULT_PRIVILEGE_SOURCE)
  const [showPolicyNotice, setShowPolicyNotice] = useState(DEFAULT_SHOW_POLICY_NOTICE)
  const [platformAccess, setPlatformAccess] = useState<AssessmentPlatformAccess>(
    DEFAULT_ASSESSMENT_PLATFORM_ACCESS,
  )

  const load = useCallback(async () => {
    if (!scope) return
    clearError()
    try {
      const [data, policies] = await Promise.all([
        instructorAdminApi.getAssessmentGovernance(scope),
        instructorAdminApi.getCoursePolicies(scope).catch(() => null),
      ])
      setPrivilegeSource(data.assessment_privilege_source)
      setShowPolicyNotice(data.show_course_policy_notice)
      const fromGovernance = data.platform_access
        ? extractAssessmentPlatformAccess({ platform_access: data.platform_access })
        : null
      const fromPolicy = policies
        ? parseAssessmentPolicy(policies.assessment_policy).access.platform_access
        : null
      setPlatformAccess(fromGovernance ?? fromPolicy ?? DEFAULT_ASSESSMENT_PLATFORM_ACCESS)
      resetDirty()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load assessment governance.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [scope, clearError, resetDirty, setError])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    void load()
  }, [ready, load])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void load()
  }, [load])

  const handleReset = useCallback(() => {
    setPrivilegeSource(DEFAULT_PRIVILEGE_SOURCE)
    setShowPolicyNotice(DEFAULT_SHOW_POLICY_NOTICE)
    setPlatformAccess(DEFAULT_ASSESSMENT_PLATFORM_ACCESS)
    markDirty()
  }, [markDirty])

  const handleSave = useCallback(() => {
    if (!scope) return
    void runSave(async () => {
      await instructorAdminApi.patchAssessmentGovernance(scope, {
        assessment_privilege_source: privilegeSource,
        show_course_policy_notice: showPolicyNotice,
        platform_access: platformAccess,
      })
    })
  }, [scope, privilegeSource, showPolicyNotice, platformAccess, runSave])

  const adminStyles = useAdminStyles()
  const { native, type } = adminStyles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        radioRow: {
          flexDirection: "row",
          alignItems: "center",
          minHeight: NATIVE.rowMinHeight,
          paddingVertical: 11,
          paddingHorizontal: 14,
          gap: 12,
          backgroundColor: native.secondaryGrouped,
        },
        radioRowBorder: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        radioRowPressed: { opacity: NATIVE.pressedOpacity },
        radioCopy: { flex: 1, gap: 2 },
        radioLabel: type.body,
        radioSubtitle: { ...type.caption, lineHeight: 17 },
        radioEmpty: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: Platform.OS === "ios" ? StyleSheet.hairlineWidth : 1.5,
          borderColor: native.separatorOpaque,
        },
        resetRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: NATIVE.rowMinHeight,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: native.secondaryGrouped,
        },
        resetRowText: {
          ...type.bodyEmphasis,
          color: FACULTY_ADMIN_COLOR.link,
        },
      }),
    [native, type],
  )

  return (
    <FacultyAdminScreen
      loading={loading}
      saving={saving}
      refreshing={refreshing}
      error={error || null}
      dirty={dirty}
      successMessage={successMessage}
      onSave={handleSave}
      onRefresh={onRefresh}
    >
      <FacultyAdminSection
        title="Privilege source"
        footer="How assessment opportunities are granted for your selected course."
      >
        {PRIVILEGE_OPTIONS.map(({ value, label, subtitle }, index) => {
          const selected = privilegeSource === value
          const isLast = index === PRIVILEGE_OPTIONS.length - 1
          return (
            <Pressable
              key={value}
              onPress={() => {
                if (ASSESSMENT_PRIVILEGE_SOURCES.includes(value)) {
                  setPrivilegeSource(value)
                  markDirty()
                }
              }}
              android_ripple={{ color: "rgba(0,0,0,0.08)" }}
              style={({ pressed }) => [
                styles.radioRow,
                !isLast && styles.radioRowBorder,
                pressed && styles.radioRowPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
            >
              <View style={styles.radioCopy}>
                <Text style={styles.radioLabel}>{label}</Text>
                <Text style={styles.radioSubtitle} numberOfLines={5}>
                  {subtitle}
                </Text>
              </View>
              {selected ? (
                <Ionicons name="checkmark-circle" size={22} color={FACULTY_ADMIN_COLOR.link} />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </Pressable>
          )
        })}
      </FacultyAdminSection>

      <FacultyAdminSection
        title="Where students may take assessments"
        footer="Course default for each assessment type. You can override these on an individual quiz, homework, or exam."
      >
        {PLATFORM_KIND_ROWS.map(({ kind, label }) => (
          <FacultyAdminToggleRow
            key={kind}
            label={`${label} on mobile`}
            subtitle={
              platformAccess[kind].mobile
                ? "Students can start this type in the CourseCollab app."
                : "Students must take this type on the CourseCollab website."
            }
            value={platformAccess[kind].mobile}
            onChange={(next) => {
              setPlatformAccess((prev) => ({
                ...prev,
                [kind]: { ...prev[kind], mobile: next },
              }))
              markDirty()
            }}
          />
        ))}
      </FacultyAdminSection>

      <FacultyAdminSection
        title="Student visibility"
        footer="Optional notice on the student course dashboard."
      >
        <FacultyAdminToggleRow
          label="Show course policy notice"
          subtitle="Compact card explaining instructor-controlled assessment policies."
          value={showPolicyNotice}
          onChange={(next) => {
            setShowPolicyNotice(next)
            markDirty()
          }}
        />
      </FacultyAdminSection>

      <FacultyAdminSection
        title="Restore Defaults"
        footer="Resets privilege source, platform defaults, and the student notice. Tap Save Changes to persist."
      >
        <Pressable
          style={({ pressed }) => [styles.resetRow, pressed && { opacity: NATIVE.pressedOpacity }]}
          onPress={handleReset}
          accessibilityRole="button"
          accessibilityLabel="Reset to defaults"
        >
          <Ionicons name="refresh-outline" size={18} color={FACULTY_ADMIN_COLOR.link} />
          <Text style={styles.resetRowText}>Reset to Defaults</Text>
        </Pressable>
      </FacultyAdminSection>
    </FacultyAdminScreen>
  )
}
