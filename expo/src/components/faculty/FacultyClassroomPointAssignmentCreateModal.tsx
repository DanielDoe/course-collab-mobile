import { useEffect, useMemo, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorSession } from "../../lib/instructor-api"
import { FACULTY_CLASSROOM_POINTS_COLOR } from "../../lib/faculty-classroom-points-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyFilterSheet } from "./faculty-module-shell"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetSection,
  FacultySheetSelectButton,
  FacultySheetSubmitButton,
  FacultySheetTextInput,
  FacultySheetToggleRow,
  FACULTY_SHEET_CHIP_RADIUS,
} from "./faculty-collab-sheet-ui"
import { SHEET_CLASSROOM_POINTS } from "./faculty-sheet-semantics"
import { FacultyDateTimeField } from "./FacultyNativePickers"

type Scope = { instructorId: number; courseId: number }

type SubmissionKind = "code" | "solution"

type Props = {
  visible: boolean
  scope: Scope | null
  sessions: InstructorSession[]
  defaultSession?: string
  onClose: () => void
  onCreated: () => void
}

function parseDueAtInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T")
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function buildSolutionQuestionConfig(title: string, problemStatement: string) {
  return {
    question_type: "circuit_submission" as const,
    question_text: problemStatement.trim(),
    solution_upload_config: {
      title: title.trim() || problemStatement.trim().slice(0, 80),
      submission_instructions:
        "Show all work. Upload a PDF or photo, or use the ink workspace to write your solution.",
      require_solution_upload: true,
      grading_type: "manual",
    },
    points_hint: 2.5,
  }
}

export function FacultyClassroomPointAssignmentCreateModal({
  visible,
  scope,
  sessions,
  defaultSession,
  onClose,
  onCreated,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submissionKind, setSubmissionKind] = useState<SubmissionKind>("code")
  const [problemStatement, setProblemStatement] = useState("")
  const [session, setSession] = useState<string>("all")
  const [neverExpires, setNeverExpires] = useState(true)
  const [dueAtLocal, setDueAtLocal] = useState("")
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

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

  const sessionLabel = sessionOptions.find((o) => o.value === session)?.label ?? session

  useEffect(() => {
    if (!visible) {
      setTitle("")
      setDescription("")
      setSubmissionKind("code")
      setProblemStatement("")
      setNeverExpires(true)
      setDueAtLocal("")
      setError("")
      setSession(defaultSession && defaultSession !== "ALL" ? defaultSession : "all")
      return
    }
    setSession(defaultSession && defaultSession !== "ALL" ? defaultSession : "all")
  }, [visible, defaultSession])

  async function handleCreate() {
    if (!scope) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      AppAlert.alert("Title required", "Enter an assignment title.")
      return
    }
    if (submissionKind === "solution" && !problemStatement.trim()) {
      AppAlert.alert("Problem statement required", "Solution assignments need a problem statement for students.")
      return
    }
    if (!neverExpires && !dueAtLocal.trim()) {
      AppAlert.alert("Due date required", 'Set a due date or choose "No due date".')
      return
    }

    let dueAt: string | null = null
    if (!neverExpires) {
      dueAt = parseDueAtInput(dueAtLocal)
      if (!dueAt) {
        AppAlert.alert("Invalid due date", "Pick a valid date and time.")
        return
      }
    }

    setCreating(true)
    setError("")
    try {
      await instructorApi.createClassroomPointAssignment(scope, {
        title: trimmedTitle,
        description: description.trim() || null,
        session: session === "all" ? null : session,
        submissionKind,
        dueAt,
        durationHours: null,
        questionConfig:
          submissionKind === "solution"
            ? buildSolutionQuestionConfig(trimmedTitle, problemStatement)
            : null,
      })
      AppAlert.alert("Created", "Assignment created. Students can submit from Classroom Points.")
      onCreated()
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not create assignment."
      setError(message)
      AppAlert.alert("Create failed", message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="New assignment" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetSection label="Assignment details" tone={SHEET_CLASSROOM_POINTS.assignment}>
            <FacultySheetField label="Title">
              <FacultySheetTextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Assignment title…"
                accessibilityLabel="Assignment title"
                testID="assignment-title"
                keyboardType="ascii-capable"
                autoCorrect={false}
                autoFocus
              />
            </FacultySheetField>
            <FacultySheetField label="Description">
              <FacultySheetTextInput
                style={collabSheetStyles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Instructions for students…"
                accessibilityLabel="Description"
                multiline
                textAlignVertical="top"
              />
            </FacultySheetField>
          </FacultySheetSection>

          <FacultySheetSection label="Submission type" tone={SHEET_CLASSROOM_POINTS.review}>
            <View style={localStyles.kindRow}>
              <KindChip
                label="Code submission"
                icon="code-slash-outline"
                active={submissionKind === "code"}
                onPress={() => setSubmissionKind("code")}
              />
              <KindChip
                label="Solution upload"
                icon="create-outline"
                active={submissionKind === "solution"}
                onPress={() => setSubmissionKind("solution")}
              />
            </View>
          </FacultySheetSection>

          {submissionKind === "solution" ? (
            <FacultySheetSection label="Problem statement" tone={SHEET_CLASSROOM_POINTS.assignment}>
              <FacultySheetField label="Statement">
                <FacultySheetTextInput
                  style={collabSheetStyles.textAreaLg}
                  value={problemStatement}
                  onChangeText={setProblemStatement}
                  placeholder="Describe the problem students should solve…"
                  multiline
                  textAlignVertical="top"
                />
              </FacultySheetField>
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="Availability" tone={SHEET_CLASSROOM_POINTS.leaderboard}>
            <FacultySheetField label="Section">
              <FacultySheetSelectButton value={sessionLabel} onPress={() => setSessionSheetOpen(true)} />
            </FacultySheetField>

            <FacultySheetToggleRow
              icon="infinite-outline"
              title="No due date"
              subtitle="Assignment stays open until you close it"
              value={neverExpires}
              onValueChange={setNeverExpires}
            />

            {!neverExpires ? (
              <>
                <FacultySheetField label="Due date & time">
                  <FacultyDateTimeField
                    value={dueAtLocal}
                    onChange={setDueAtLocal}
                    dateLabel="Due date"
                    timeLabel="Due time"
                    joinStyle="space"
                  />
                </FacultySheetField>
              </>
            ) : null}
          </FacultySheetSection>

          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetSubmitButton
            label="Create assignment"
            onPress={() => void handleCreate()}
            loading={creating}
            disabled={creating}
          />
        </ScrollView>

        <FacultyFilterSheet
          visible={sessionSheetOpen}
          title="Target section"
          subtitle="Which section can see this assignment?"
          options={sessionOptions}
          value={session}
          onSelect={setSession}
          onClose={() => setSessionSheetOpen(false)}
        />
      </FacultySheetContainer>
    </Modal>
  )
}

function KindChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  active: boolean
  onPress: () => void
}) {
  const { native, tokens, type } = useModuleTheme()

  return (
    <Pressable
      style={[
        localStyles.kindChip,
        {
          borderColor: active ? FACULTY_CLASSROOM_POINTS_COLOR.action : tokens.border,
          backgroundColor: active
            ? FACULTY_CLASSROOM_POINTS_COLOR.action
            : semanticSoft(FACULTY_CLASSROOM_POINTS_COLOR.link, tokens.isDark),
        },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={active ? "#ffffff" : FACULTY_CLASSROOM_POINTS_COLOR.link} />
      <Text
        style={[
          type.caption,
          localStyles.kindChipText,
          { color: active ? "#ffffff" : native.label },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const localStyles = StyleSheet.create({
  kindRow: { flexDirection: "row", gap: 8 },
  kindChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: FACULTY_SHEET_CHIP_RADIUS,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  kindChipText: { fontWeight: "600", textAlign: "center" },
})
