import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import type { AssessmentType } from "../../lib/faculty-assessment-utils"
import { FACULTY_ASSESSMENT_COLOR } from "../../lib/faculty-assessment-theme"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type InstructorAttemptOverride,
  type InstructorRolloverGrant,
  type InstructorSession,
  type InstructorStudent} from "../../lib/instructor-api"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NativeSelect } from "../NativeSelect"
import { EXTRA_ATTEMPT_OPTIONS, HOUR_GRANT_OPTIONS, withCurrentOption } from "./FacultyNativePickers"
import { FACULTY_SHEET_CHIP_RADIUS } from "./faculty-collab-sheet-ui"
import {
  EditorNotice,
  EditorSectionCard,
  EditorTextField} from "./FacultyAssessmentEditorUi"

type Scope = { instructorId: number; courseId: number }

type Props = {
  scope: Scope
  quizId: number
  assessmentType: AssessmentType
  assessmentLabel: string
  rolloverHours: number
  sessions: InstructorSession[]
  retakeEnabled: boolean
}

function useGrantsPanelStyles() {
  const { native, tokens } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_ASSESSMENT_COLOR.link, tokens.isDark)
  const styles = useMemo(
    () =>
      StyleSheet.create({
        stack: { gap: 14 },
        loading: { paddingVertical: 48, alignItems: "center" },
        primaryBtn: {
          backgroundColor: FACULTY_ASSESSMENT_COLOR.action,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          paddingVertical: 12,
          alignItems: "center",
        },
        btnDisabled: { opacity: 0.6 },
        primaryBtnText: { color: FACULTY_ASSESSMENT_COLOR.actionInk, fontWeight: "600", fontSize: 14 },
        list: { gap: 8 },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 10,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        rowCopy: { flex: 1, gap: 2 },
        rowTitle: { fontSize: 14, fontWeight: "700", color: native.label },
        rowMeta: { fontSize: 12, fontWeight: "600", color: native.secondaryLabel },
        badge: { borderRadius: FACULTY_SHEET_CHIP_RADIUS, paddingHorizontal: 8, paddingVertical: 4 },
        badgeLive: { backgroundColor: linkSoft },
        badgeMuted: { backgroundColor: native.fill },
        badgeText: { fontSize: 11, fontWeight: "600", color: native.secondaryLabel },
      }),
    [native, tokens, linkSoft],
  )
  return { styles, tokens }
}

export function FacultyAssessmentStudentGrantsPanel({
  scope,
  quizId,
  assessmentType,
  assessmentLabel,
  rolloverHours,
  sessions,
  retakeEnabled}: Props) {
  const { styles, tokens } = useGrantsPanelStyles()
  const isSingleSitting = assessmentType === "mid_semester" || assessmentType === "final"

  const [rolloverRows, setRolloverRows] = useState<InstructorRolloverGrant[]>([])
  const [overrides, setOverrides] = useState<InstructorAttemptOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const [sessionId, setSessionId] = useState("")
  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [grantHours, setGrantHours] = useState(String(rolloverHours || 24))
  const [extraAttempts, setExtraAttempts] = useState("1")
  const [overrideReason, setOverrideReason] = useState("Instructor-granted retake")

  const sessionOptions = useMemo(
    () => sessions.map((s) => ({ value: String(s.id), label: s.code })),
    [sessions],
  )

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        value: String(s.id),
        label: `${s.full_name} (${s.student_id})`})),
    [students],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rollovers, overrideRows] = await Promise.all([
        isSingleSitting ? Promise.resolve([]) : instructorApi.getRolloverGrants(scope, quizId),
        instructorApi.getAttemptOverrides(scope, quizId),
      ])
      setRolloverRows(rollovers)
      setOverrides(overrideRows.filter((o) => o.is_active))
    } catch {
      setRolloverRows([])
      setOverrides([])
    } finally {
      setLoading(false)
    }
  }, [scope, quizId, isSingleSitting])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!sessionId) {
      setStudents([])
      setStudentId("")
      return
    }
    setStudentsLoading(true)
    instructorApi
      .getStudentsBySessionId(scope, Number(sessionId))
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false))
  }, [scope, sessionId])

  async function handleGrantRollover() {
    if (!studentId) {
      AppAlert.alert("Select a student", "Choose a section and student first.")
      return
    }
    const hours = Number(grantHours)
    setActing(true)
    try {
      await instructorApi.grantRollover(scope, {
        quizId,
        studentId: Number(studentId),
        hours: Number.isFinite(hours) ? Math.max(1, Math.min(72, hours)) : rolloverHours})
      await load()
      AppAlert.alert("Extension granted", "The student can complete this assessment during the extension window.")
    } catch (err) {
      AppAlert.alert("Could not grant", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActing(false)
    }
  }

  async function handleGrantOverride() {
    if (!studentId) {
      AppAlert.alert("Select a student", "Choose a section and student first.")
      return
    }
    const attempts = Number(extraAttempts)
    setActing(true)
    try {
      await instructorApi.grantAttemptOverride(scope, {
        quizId,
        studentId: Number(studentId),
        additionalAttempts: Number.isFinite(attempts) ? Math.max(1, Math.min(10, attempts)) : 1,
        reason: overrideReason.trim() || undefined})
      await load()
      AppAlert.alert("Retake granted", "Extra attempt(s) added for this student.")
    } catch (err) {
      AppAlert.alert("Could not grant", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActing(false)
    }
  }

  async function revokeOverride(id: number) {
    setActing(true)
    try {
      await instructorApi.revokeAttemptOverride(scope, id)
      await load()
    } catch (err) {
      AppAlert.alert("Could not revoke", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={FACULTY_ASSESSMENT_COLOR.link} />
      </View>
    )
  }

  return (
    <View style={styles.stack}>
      {!isSingleSitting ? (
        <EditorSectionCard
          icon="time-outline"
          iconBg="#eff6ff"
          iconColor="#2563eb"
          title="Grant rollover extension"
          subtitle="Give a specific student extra hours after the deadline"
        >
          <NativeSelect
            label="Section"
            placeholder="Select section"
            value={sessionId}
            options={sessionOptions}
            onChange={setSessionId}
          />
          <NativeSelect
            label="Student"
            placeholder="Select student"
            value={studentId}
            options={studentOptions}
            onChange={setStudentId}
            loading={studentsLoading}
            disabled={!sessionId}
          />
          <NativeSelect
            label="Extension hours"
            placeholder="24 hours"
            value={grantHours}
            options={withCurrentOption(HOUR_GRANT_OPTIONS, grantHours, `${grantHours} hours`)}
            onChange={setGrantHours}
          />
          <Pressable
            style={[styles.primaryBtn, acting && styles.btnDisabled]}
            disabled={acting}
            onPress={() => void handleGrantRollover()}
          >
            <Text style={styles.primaryBtnText}>{acting ? "…" : "Grant extension"}</Text>
          </Pressable>

          {rolloverRows.length > 0 ? (
            <View style={styles.list}>
              {rolloverRows.map((row) => (
                <View key={`${row.studentId}-${row.appliedAt}`} style={styles.row}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{row.fullName}</Text>
                    <Text style={styles.rowMeta}>
                      {row.studentNumber}
                      {row.section ? ` · ${row.section}` : ""} · expires{" "}
                      {formatFacultyRelativeTime(row.expiresAt)}
                    </Text>
                  </View>
                  <View style={[styles.badge, row.isActive ? styles.badgeLive : styles.badgeMuted]}>
                    <Text style={styles.badgeText}>{row.isActive ? "Active" : "Expired"}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EditorNotice tone="info" text="No rollover extensions granted yet." />
          )}
        </EditorSectionCard>
      ) : (
        <EditorNotice
          tone="warn"
          text={`Rollover extensions are not available for ${assessmentLabel.toLowerCase()}.`}
        />
      )}

      <EditorSectionCard
        icon="refresh-outline"
        iconBg="#ecfdf5"
        iconColor="#059669"
        title="Grant extra retake"
        subtitle="Add attempts for one student (stacks with membership limits)"
      >
        {!retakeEnabled && !isSingleSitting ? (
          <EditorNotice tone="info" text="Assessment retakes are off, but per-student overrides still work." />
        ) : null}
        <NativeSelect
          label="Section"
          placeholder="Select section"
          value={sessionId}
          options={sessionOptions}
          onChange={setSessionId}
        />
        <NativeSelect
          label="Student"
          placeholder="Select student"
          value={studentId}
          options={studentOptions}
          onChange={setStudentId}
          loading={studentsLoading}
          disabled={!sessionId}
        />
        <NativeSelect
          label="Extra attempts"
          placeholder="1 extra attempt"
          value={extraAttempts}
          options={withCurrentOption(EXTRA_ATTEMPT_OPTIONS, extraAttempts)}
          onChange={setExtraAttempts}
        />
        <EditorTextField
          label="Reason (optional)"
          value={overrideReason}
          onChangeText={setOverrideReason}
          multiline
        />
        <Pressable
          style={[styles.primaryBtn, acting && styles.btnDisabled]}
          disabled={acting}
          onPress={() => void handleGrantOverride()}
        >
          <Text style={styles.primaryBtnText}>{acting ? "…" : "Grant retake"}</Text>
        </Pressable>

        {overrides.length > 0 ? (
          <View style={styles.list}>
            {overrides.map((row) => (
              <View key={row.id} style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{row.student_name}</Text>
                  <Text style={styles.rowMeta}>
                    +{row.additional_attempts} attempt{row.additional_attempts === 1 ? "" : "s"}
                    {row.reason ? ` · ${row.reason}` : ""}
                  </Text>
                </View>
                <Pressable onPress={() => void revokeOverride(row.id)} hitSlop={8} disabled={acting}>
                  <Ionicons name="close-circle-outline" size={22} color="#b91c1c" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <EditorNotice tone="info" text="No active retake overrides." />
        )}
      </EditorSectionCard>
    </View>
  )
}
