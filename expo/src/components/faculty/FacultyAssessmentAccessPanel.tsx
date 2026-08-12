import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { QuizEditorDraft } from "../../lib/faculty-quiz-editor-mapper"
import { FACULTY_ASSESSMENT_COLOR } from "../../lib/faculty-assessment-theme"
import { instructorApi, type InstructorSession, type InstructorStudent } from "../../lib/instructor-api"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NativeSelect } from "../NativeSelect"
import { FACULTY_SHEET_CHIP_RADIUS } from "./faculty-collab-sheet-ui"
import {
  EditorNotice,
  EditorSectionCard,
  EditorToggleRow} from "./FacultyAssessmentEditorUi"

type Scope = { instructorId: number; courseId: number }

type Props = {
  scope: Scope
  sessions: InstructorSession[]
  draft: QuizEditorDraft
  assessmentLabel: string
  onChange: (patch: Partial<QuizEditorDraft>) => void
}

function useAccessPanelStyles() {
  const { native, tokens, type } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_ASSESSMENT_COLOR.link, tokens.isDark)
  const styles = useMemo(
    () =>
      StyleSheet.create({
        stack: { gap: 14 },
        selectAllBtn: { alignSelf: "flex-start" },
        selectAllText: { fontSize: 13, fontWeight: "700", color: FACULTY_ASSESSMENT_COLOR.link },
        studentList: { gap: 8 },
        studentRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 10,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.fill,
        },
        studentRowActive: { backgroundColor: linkSoft, borderColor: FACULTY_ASSESSMENT_COLOR.link },
        studentCopy: { flex: 1, gap: 2 },
        studentName: { fontSize: 14, fontWeight: "700", color: native.label },
        studentMeta: { fontSize: 12, fontWeight: "600", color: native.secondaryLabel },
        summary: { fontSize: 12, fontWeight: "700", color: native.secondaryLabel },
      }),
    [native, tokens, type, linkSoft],
  )
  return { styles, tokens, native }
}

export function FacultyAssessmentAccessPanel({
  scope,
  sessions,
  draft,
  assessmentLabel,
  onChange}: Props) {
  const { styles, tokens, native } = useAccessPanelStyles()
  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  const sessionOptions = useMemo(
    () =>
      sessions.map((s) => ({
        value: String(s.id),
        label: `${s.code}${s.description ? ` · ${s.description}` : ""}`})),
    [sessions],
  )

  const selectedSessionId = draft.access_restriction_session_id
    ? String(draft.access_restriction_session_id)
    : ""

  const loadStudents = useCallback(async () => {
    if (!draft.access_restriction_session_id) {
      setStudents([])
      return
    }
    setLoadingStudents(true)
    try {
      const rows = await instructorApi.getStudentsBySessionId(scope, draft.access_restriction_session_id)
      setStudents(rows)
    } catch {
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }, [scope, draft.access_restriction_session_id])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  function toggleStudent(id: number) {
    const set = new Set(draft.allowed_student_ids)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onChange({ allowed_student_ids: [...set] })
  }

  function selectAllInSession() {
    const ids = new Set(draft.allowed_student_ids)
    const allSelected = students.length > 0 && students.every((s) => ids.has(s.id))
    if (allSelected) {
      for (const s of students) ids.delete(s.id)
    } else {
      for (const s of students) ids.add(s.id)
    }
    onChange({ allowed_student_ids: [...ids] })
  }

  return (
    <View style={styles.stack}>
      <EditorSectionCard
        icon="people-outline"
        title="Who can access"
        subtitle={`Limit ${assessmentLabel.toLowerCase()} to students present in class`}
      >
        <EditorToggleRow
          label="Restrict to selected students"
          hint="Only checked students can start this assessment"
          value={draft.restrict_access_to_students}
          onValueChange={(v) =>
            onChange({
              restrict_access_to_students: v,
              allowed_student_ids: v ? draft.allowed_student_ids : [],
              access_restriction_session_id: v ? draft.access_restriction_session_id : null})
          }
        />

        {draft.restrict_access_to_students ? (
          <>
            <NativeSelect
              label="Class section"
              placeholder="Select a section"
              value={selectedSessionId}
              options={sessionOptions}
              onChange={(v) => onChange({ access_restriction_session_id: Number(v) })}
            />

            {draft.access_restriction_session_id ? (
              <>
                <Pressable style={styles.selectAllBtn} onPress={selectAllInSession}>
                  <Text style={styles.selectAllText}>
                    {students.length > 0 &&
                    students.every((s) => draft.allowed_student_ids.includes(s.id))
                      ? "Deselect all in section"
                      : "Select all in section"}
                  </Text>
                </Pressable>

                {loadingStudents ? (
                  <ActivityIndicator color={FACULTY_ASSESSMENT_COLOR.link} />
                ) : students.length === 0 ? (
                  <EditorNotice tone="warn" text="No students found for this section." />
                ) : (
                  <View style={styles.studentList}>
                    {students.map((student) => {
                      const active = draft.allowed_student_ids.includes(student.id)
                      return (
                        <Pressable
                          key={student.id}
                          style={[styles.studentRow, active && styles.studentRowActive]}
                          onPress={() => toggleStudent(student.id)}
                        >
                          <Ionicons
                            name={active ? "checkbox" : "square-outline"}
                            size={20}
                            color={active ? FACULTY_ASSESSMENT_COLOR.link : native.tertiaryLabel}
                          />
                          <View style={styles.studentCopy}>
                            <Text style={styles.studentName}>{student.full_name}</Text>
                            <Text style={styles.studentMeta}>
                              {student.student_id}
                              {student.section ? ` · ${student.section}` : ""}
                            </Text>
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>
                )}

                <Text style={styles.summary}>
                  {draft.allowed_student_ids.length} student
                  {draft.allowed_student_ids.length === 1 ? "" : "s"} selected
                </Text>
              </>
            ) : (
              <EditorNotice tone="info" text="Select a section to load the student roster." />
            )}
          </>
        ) : null}
      </EditorSectionCard>
    </View>
  )
}
