import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  assignmentFormFromRow,
  classroomAssignmentFormToUpdatePayload,
  emptySolutionQuestionConfig,
  formatAssignmentDueLabel,
  parseDueAtInput,
  type ClassroomAssignmentEditTab,
  type ClassroomAssignmentFormValues,
} from "../../lib/faculty-classroom-assignment-form"
import { assignmentKindLabel, formatClassroomDisplayText } from "../../lib/faculty-classroom-points-utils"
import {
  instructorApi,
  type ClassroomPointAssignment,
  type InstructorSession,
} from "../../lib/instructor-api"
import {
  isSolutionAssignment,
  shortenTaskTitle,
  type ClassroomQuestionConfig,
} from "../../lib/classroom-submission"
import { FACULTY_CLASSROOM_POINTS_COLOR } from "../../lib/faculty-classroom-points-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetSection,
  FacultySheetSelectButton,
  FacultySheetTextInput,
  FacultySheetToggleRow,
  FACULTY_SHEET_CHIP_RADIUS,
} from "./faculty-collab-sheet-ui"
import { FacultyFilterSheet, FacultySegmentedControl } from "./faculty-module-shell"
import { SHEET_CLASSROOM_POINTS } from "./faculty-sheet-semantics"
import { FacultyDateTimeField } from "./FacultyNativePickers"

type Scope = { instructorId: number; courseId: number }

type Props = {
  assignment: ClassroomPointAssignment | null
  scope: Scope | null
  sessions: InstructorSession[]
  onClose: () => void
  onUpdated: () => void
}

const DETAIL_TABS: Array<{ id: ClassroomAssignmentEditTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "details", label: "Details", icon: "document-text-outline" },
  { id: "problem", label: "Problem", icon: "help-circle-outline" },
  { id: "schedule", label: "Schedule", icon: "calendar-outline" },
]

const sheetStyles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  footerRow: { flexDirection: "row", gap: 10 },
  footerBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: FACULTY_SHEET_CHIP_RADIUS,
    paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  saveBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: FACULTY_SHEET_CHIP_RADIUS,
    paddingVertical: 13,
    minHeight: 48,
  },
  tabBarWrap: { paddingBottom: 4 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  previewBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  helperText: { fontSize: 12, lineHeight: 17, fontWeight: "500" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: FACULTY_SHEET_CHIP_RADIUS,
    paddingVertical: 12,
    minHeight: 48,
  },
})

function patchQuestionConfig(
  current: ClassroomQuestionConfig | null,
  patch: Partial<ClassroomQuestionConfig>,
  title: string,
): ClassroomQuestionConfig {
  const base = current ?? emptySolutionQuestionConfig(title)
  return {
    ...base,
    ...patch,
    solution_upload_config: patch.solution_upload_config
      ? { ...base.solution_upload_config, ...patch.solution_upload_config }
      : base.solution_upload_config,
  }
}

export function FacultyClassroomPointAssignmentDetailModal({
  assignment: assignmentSeed,
  scope,
  sessions,
  onClose,
  onUpdated,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()

  const [assignment, setAssignment] = useState<ClassroomPointAssignment | null>(null)
  const [form, setForm] = useState<ClassroomAssignmentFormValues | null>(null)
  const [editTab, setEditTab] = useState<ClassroomAssignmentEditTab>("details")
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const hydrate = useCallback((row: ClassroomPointAssignment) => {
    setForm(assignmentFormFromRow(row))
  }, [])

  const loadDetail = useCallback(async () => {
    if (!scope || !assignmentSeed) return
    setRefreshing(true)
    setLoadError("")
    try {
      const row = await instructorApi.getClassroomPointAssignment(scope, assignmentSeed.id)
      const next = row ?? assignmentSeed
      setAssignment(next)
      hydrate(next)
    } catch (err) {
      setAssignment(assignmentSeed)
      hydrate(assignmentSeed)
      setLoadError(err instanceof ApiError ? err.message : "Could not refresh assignment.")
    } finally {
      setRefreshing(false)
    }
  }, [scope, assignmentSeed, hydrate])

  useEffect(() => {
    if (!assignmentSeed) {
      setAssignment(null)
      setForm(null)
      setLoadError("")
      setEditTab("details")
      return
    }
    setAssignment(assignmentSeed)
    hydrate(assignmentSeed)
    setEditTab("details")
    void loadDetail()
  }, [assignmentSeed, hydrate, loadDetail])

  const sessionOptions = useMemo(() => {
    const seen = new Set<string>()
    const options: Array<{ value: string; label: string }> = [{ value: "all", label: "All sections" }]
    for (const s of sessions) {
      const code = s.code?.trim()
      if (!code || seen.has(code)) continue
      seen.add(code)
      options.push({ value: code, label: s.description?.trim() || code })
    }
    return options
  }, [sessions])

  if (!assignmentSeed || !form) return null

  const row = assignment ?? assignmentSeed
  const isSolution = isSolutionAssignment(row)
  const tabs = isSolution ? DETAIL_TABS : DETAIL_TABS.filter((t) => t.id !== "problem")
  const sessionLabel = sessionOptions.find((o) => o.value === form.session)?.label ?? form.session
  const questionConfig = form.questionConfig ?? emptySolutionQuestionConfig(form.title)
  const problemPreview = questionConfig.question_text?.trim() ?? ""
  const active = row.is_active !== false
  const displayTitle = shortenTaskTitle(formatClassroomDisplayText(row.title)) || "Assignment"
  const busy = saving || deleting

  function updateForm(patch: Partial<ClassroomAssignmentFormValues>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function updateQuestionConfig(patch: Partial<ClassroomQuestionConfig>) {
    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        questionConfig: patchQuestionConfig(prev.questionConfig, patch, prev.title),
      }
    })
  }

  function handleCancel() {
    hydrate(row)
    onClose()
  }

  async function handleSave() {
    if (!scope || !form) return
    if (!form.title.trim()) {
      AppAlert.alert("Title required", "Enter an assignment title.")
      setEditTab("details")
      return
    }
    if (isSolution && !form.questionConfig?.question_text?.trim()) {
      AppAlert.alert("Problem statement required", "Solution assignments need a problem statement students can read.")
      setEditTab("problem")
      return
    }
    if (!form.neverExpires && !form.dueAtLocal.trim()) {
      AppAlert.alert("Due date required", 'Set a due date or choose "No due date".')
      setEditTab("schedule")
      return
    }
    if (!form.neverExpires && !parseDueAtInput(form.dueAtLocal)) {
      AppAlert.alert("Invalid due date", "Pick a valid date and time.")
      setEditTab("schedule")
      return
    }

    setSaving(true)
    try {
      const payload = classroomAssignmentFormToUpdatePayload(form)
      await instructorApi.updateClassroomPointAssignment(scope, row.id, payload)
      AppAlert.alert("Saved", "Assignment updated.")
      onUpdated()
      await loadDetail()
      onClose()
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Could not save assignment.")
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!scope) return
    AppAlert.alert(
      "Delete assignment?",
      "This removes the assignment and revokes any points tied to student submissions.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDeleting(true)
              try {
                const res = await instructorApi.deleteClassroomPointAssignment(scope, row.id)
                AppAlert.alert("Deleted", res.message ?? "Assignment removed.")
                onUpdated()
                onClose()
              } catch (err) {
                AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
              } finally {
                setDeleting(false)
              }
            })()
          },
        },
      ],
    )
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => !busy && handleCancel()}>
      <FacultySheetContainer style={sheetStyles.root}>
        <FacultySheetChrome topInset={insets.top} title="Assignment" onClose={() => !busy && handleCancel()} />

        <View style={sheetStyles.body}>
          <View style={sheetStyles.tabBarWrap}>
            <FacultySegmentedControl
              value={editTab}
              onChange={setEditTab}
              options={tabs.map((t) => ({ id: t.id, label: t.label }))}
            />
          </View>

          <ScrollView
            style={sheetStyles.scroll}
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: 16 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {refreshing ? (
              <View style={styles.refreshRow}>
                <ActivityIndicator color={FACULTY_CLASSROOM_POINTS_COLOR.link} size="small" />
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                  Refreshing…
                </Text>
              </View>
            ) : null}

            {loadError ? (
              <Text style={[type.caption, { color: tokens.warning, fontWeight: "600" }]}>{loadError}</Text>
            ) : null}

            <View style={sheetStyles.statusRow}>
              <FacultyStatusPill label={assignmentKindLabel(form.submissionKind)} tone="neutral" />
              <FacultyStatusPill label={active ? "Open" : "Expired"} tone={active ? "live" : "neutral"} />
              {row.session ? <FacultyStatusPill label={row.session} tone="neutral" /> : null}
            </View>

            <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
              {displayTitle}
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
              Due {formatAssignmentDueLabel(row.due_at)}
            </Text>

            {editTab === "details" ? (
            <FacultySheetSection label="Assignment details" tone={SHEET_CLASSROOM_POINTS.assignment}>
              <FacultySheetField label="Title">
                <FacultySheetTextInput
                  value={form.title}
                  onChangeText={(title) => updateForm({ title })}
                  placeholder="e.g., Exercise 3-3 — Supernode Analysis"
                />
              </FacultySheetField>
              <FacultySheetField label={isSolution ? "Instructor notes (optional)" : "Assignment description"}>
                <FacultySheetTextInput
                  style={collabSheetStyles.textArea}
                  value={form.description}
                  onChangeText={(description) => updateForm({ description })}
                  placeholder={
                    isSolution
                      ? "Internal notes for faculty — not shown as the problem statement."
                      : "Describe what students should implement. Used for AI validation of code submissions."
                  }
                  multiline
                  textAlignVertical="top"
                />
              </FacultySheetField>
              {isSolution ? (
                <Text style={[sheetStyles.helperText, { color: native.secondaryLabel }]}>
                  Students see the problem statement on the Problem tab, not this field.
                </Text>
              ) : null}
            </FacultySheetSection>
          ) : null}

          {editTab === "problem" && isSolution ? (
            <>
              {problemPreview ? (
                <FacultySheetSection label="Student preview" tone={SHEET_CLASSROOM_POINTS.review}>
                  <View style={[sheetStyles.previewBox, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}>
                    <QuestionMediaView media={questionConfig.question_media} embedded />
                    <QuestionContentWebView text={problemPreview} embedded />
                  </View>
                </FacultySheetSection>
              ) : null}

              <FacultySheetSection label="Problem content" tone={SHEET_CLASSROOM_POINTS.assignment}>
                <FacultySheetField label="Problem statement">
                  <FacultySheetTextInput
                    style={collabSheetStyles.textAreaLg}
                    value={questionConfig.question_text ?? ""}
                    onChangeText={(question_text) => updateQuestionConfig({ question_text })}
                    placeholder="Exercise 3-3: Apply the supernode concept…"
                    multiline
                    textAlignVertical="top"
                  />
                </FacultySheetField>
                <Text style={[sheetStyles.helperText, { color: native.secondaryLabel }]}>
                  Supports LaTeX, e.g. {"\\(I\\)"} and {"\\(\\Omega\\)"}.
                </Text>

                <FacultySheetField label="Submission instructions">
                  <FacultySheetTextInput
                    style={collabSheetStyles.textArea}
                    value={questionConfig.solution_upload_config?.submission_instructions ?? ""}
                    onChangeText={(submission_instructions) =>
                      updateQuestionConfig({
                        solution_upload_config: {
                          ...questionConfig.solution_upload_config,
                          title: form.title.trim() || problemPreview.slice(0, 80),
                          submission_instructions,
                          require_solution_upload: true,
                          grading_type: "manual",
                        },
                      })
                    }
                    placeholder="Show all work. Upload a PDF or photo…"
                    multiline
                    textAlignVertical="top"
                  />
                </FacultySheetField>

                <FacultySheetField label="Expected answer (instructor only)">
                  <FacultySheetTextInput
                    value={questionConfig.expected_answer ?? ""}
                    onChangeText={(expected_answer) => updateQuestionConfig({ expected_answer: expected_answer || undefined })}
                    placeholder="e.g., I = 0.5 A"
                  />
                </FacultySheetField>
              </FacultySheetSection>
            </>
          ) : null}

          {editTab === "schedule" ? (
            <FacultySheetSection label="Availability" tone={SHEET_CLASSROOM_POINTS.leaderboard}>
              <FacultySheetField label="Section">
                <FacultySheetSelectButton value={sessionLabel} onPress={() => setSessionSheetOpen(true)} />
              </FacultySheetField>

              <FacultySheetToggleRow
                icon="infinite-outline"
                title="No due date (never expires)"
                subtitle="Students can submit until you close or delete the assignment"
                value={form.neverExpires}
                onValueChange={(neverExpires) =>
                  updateForm({ neverExpires, dueAtLocal: neverExpires ? "" : form.dueAtLocal })
                }
              />

              {!form.neverExpires ? (
                <>
                  <FacultySheetField label="Due date & time">
                    <FacultyDateTimeField
                      value={form.dueAtLocal}
                      onChange={(dueAtLocal) => updateForm({ dueAtLocal })}
                      dateLabel="Due date"
                      timeLabel="Due time"
                      joinStyle="space"
                    />
                  </FacultySheetField>
                </>
              ) : (
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                  Students see this assignment until you set a due date or delete it.
                </Text>
              )}

              <FacultySheetToggleRow
                icon="refresh-outline"
                title="Reopen from now"
                subtitle="Resets when the assignment was posted — for reusing expired items"
                value={form.restartAvailability}
                onValueChange={(restartAvailability) => updateForm({ restartAvailability })}
              />
            </FacultySheetSection>
          ) : null}
          </ScrollView>

          <View
            style={[
              sheetStyles.footer,
              {
                paddingBottom: Math.max(insets.bottom, 12),
                borderTopColor: native.separator,
                backgroundColor: native.groupedBackground,
              },
            ]}
          >
            <View style={sheetStyles.footerRow}>
              <Pressable
                style={[sheetStyles.footerBtn, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}
                disabled={busy}
                onPress={handleCancel}
              >
                <Text style={[type.bodyEmphasis, { color: native.label }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  sheetStyles.saveBtn,
                  {
                    backgroundColor: FACULTY_CLASSROOM_POINTS_COLOR.action,
                    opacity: busy || !form.title.trim() ? 0.55 : 1,
                  },
                ]}
                disabled={busy || !form.title.trim()}
                onPress={() => void handleSave()}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={[type.bodyEmphasis, { color: "#ffffff" }]}>Save changes</Text>
                )}
              </Pressable>
            </View>
            <Pressable
              style={[
                sheetStyles.deleteBtn,
                {
                  borderColor: `${tokens.danger}33`,
                  backgroundColor: semanticSoft(tokens.danger, tokens.isDark),
                },
              ]}
              disabled={busy}
              onPress={handleDelete}
            >
              {deleting ? (
                <ActivityIndicator color={tokens.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={tokens.danger} />
                  <Text style={[type.caption, { color: tokens.danger, fontWeight: "700" }]}>Delete assignment</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <FacultyFilterSheet
          visible={sessionSheetOpen}
          title="Section"
          subtitle="Which section can submit this assignment?"
          options={sessionOptions}
          value={form.session}
          onSelect={(value) => {
            updateForm({ session: value })
            setSessionSheetOpen(false)
          }}
          onClose={() => setSessionSheetOpen(false)}
        />
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  refreshRow: { flexDirection: "row", alignItems: "center", gap: 8 },
})
