import { useCallback, useEffect, useMemo, useState } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import {
  ASSESSMENT_PRIVILEGE_SOURCES,
  type AssessmentPrivilegeSource,
} from "../../../lib/assessment-governance"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { FacultyModuleTabBar } from "../faculty-module-shell"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminToggleRow,
  useAdminSaveState,
  useAdminStyles,
} from "../faculty-admin-ui"

type GovernanceTab = "privileges" | "notice"

const TABS: Array<{ id: GovernanceTab; label: string }> = [
  { id: "privileges", label: "Privileges" },
  { id: "notice", label: "Notice" },
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
    label: "Instructor Only",
    subtitle: "Only instructors can grant assessment perks and overrides.",
  },
  {
    value: "membership_enabled",
    label: "Membership Enabled",
    subtitle: "Students with an active membership can access assessment perks.",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    subtitle: "Combine instructor control with membership-based perks.",
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
  const [tab, setTab] = useState<GovernanceTab>("privileges")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [privilegeSource, setPrivilegeSource] = useState<AssessmentPrivilegeSource>(DEFAULT_PRIVILEGE_SOURCE)
  const [showPolicyNotice, setShowPolicyNotice] = useState(DEFAULT_SHOW_POLICY_NOTICE)

  const load = useCallback(async () => {
    if (!scope) return
    clearError()
    try {
      const data = await instructorAdminApi.getAssessmentGovernance(scope)
      setPrivilegeSource(data.assessment_privilege_source)
      setShowPolicyNotice(data.show_course_policy_notice)
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
    markDirty()
  }, [markDirty])

  const handleSave = useCallback(() => {
    if (!scope) return
    void runSave(async () => {
      await instructorAdminApi.patchAssessmentGovernance(scope, {
        assessment_privilege_source: privilegeSource,
        show_course_policy_notice: showPolicyNotice,
      })
    })
  }, [scope, privilegeSource, showPolicyNotice, runSave])

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
      <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} scrollable />

      {tab === "privileges" ? (
        <FacultyAdminSection
          title="Assessment Privilege Source"
          footer="Controls how assessment perks and overrides are granted in this course."
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
                  <Text style={styles.radioSubtitle} numberOfLines={3}>
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
      ) : null}

      {tab === "notice" ? (
        <FacultyAdminSection
          title="Student Notice"
          footer="When enabled, students see assessment policy details before starting an assessment."
        >
          <FacultyAdminToggleRow
            label="Show Course Policy Notice"
            subtitle="Display assessment policy details to students before they start an assessment."
            value={showPolicyNotice}
            onChange={(next) => {
              setShowPolicyNotice(next)
              markDirty()
            }}
          />
        </FacultyAdminSection>
      ) : null}

      <FacultyAdminSection
        title="Restore Defaults"
        footer="Resets every tab to platform defaults. Tap Save Changes to persist."
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
