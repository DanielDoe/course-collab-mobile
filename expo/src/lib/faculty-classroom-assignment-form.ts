import type { ClassroomPointAssignment } from "./instructor-api"
import { formatClassroomDisplayText } from "./faculty-classroom-points-utils"
import {
  isSolutionAssignment,
  resolveAssignmentQuestionConfig,
  type ClassroomQuestionConfig,
} from "./classroom-submission"

export type ClassroomAssignmentEditTab = "details" | "problem" | "schedule"

export type ClassroomAssignmentFormValues = {
  title: string
  description: string
  submissionKind: "code" | "solution"
  questionConfig: ClassroomQuestionConfig | null
  session: string
  neverExpires: boolean
  dueAtLocal: string
  restartAvailability: boolean
}

function dueAtToLocalInput(value: string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function emptySolutionQuestionConfig(title = ""): ClassroomQuestionConfig {
  return {
    question_type: "circuit_submission",
    question_text: "",
    solution_upload_config: {
      title: title.trim() || "Assignment problem",
      submission_instructions:
        "Show all work. Upload a PDF or photo, or use the ink workspace to write your solution.",
      require_solution_upload: true,
      grading_type: "manual",
    },
    points_hint: 2.5,
  }
}

export function assignmentFormFromRow(row: ClassroomPointAssignment): ClassroomAssignmentFormValues {
  const submissionKind = isSolutionAssignment(row) ? "solution" : "code"
  const parsed = resolveAssignmentQuestionConfig(row)
  return {
    title: formatClassroomDisplayText(row.title),
    description: formatClassroomDisplayText(row.description ?? ""),
    submissionKind,
    questionConfig:
      submissionKind === "solution"
        ? parsed ?? emptySolutionQuestionConfig(formatClassroomDisplayText(row.title))
        : null,
    session: row.session?.trim() ? row.session.trim() : "all",
    neverExpires: !row.due_at,
    dueAtLocal: row.due_at ? dueAtToLocalInput(row.due_at) : "",
    restartAvailability: false,
  }
}

export function parseDueAtInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T")
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function buildQuestionConfigForSave(values: ClassroomAssignmentFormValues): ClassroomQuestionConfig | null {
  if (values.submissionKind !== "solution") return null
  const base = values.questionConfig ?? emptySolutionQuestionConfig(values.title)
  const questionText = base.question_text?.trim() ?? ""
  const upload = base.solution_upload_config
  return {
    ...base,
    question_type: base.question_type ?? "circuit_submission",
    question_text: questionText,
    solution_upload_config: {
      title: values.title.trim() || questionText.slice(0, 80) || "Assignment problem",
      submission_instructions:
        upload?.submission_instructions?.trim() ||
        "Show all work. Upload a PDF or photo, or use the ink workspace to write your solution.",
      require_solution_upload: upload?.require_solution_upload !== false,
      grading_type: upload?.grading_type ?? "manual",
      max_files: upload?.max_files,
    },
  }
}

export function classroomAssignmentFormToUpdatePayload(values: ClassroomAssignmentFormValues) {
  let dueAt: string | null = null
  if (!values.neverExpires) {
    dueAt = parseDueAtInput(values.dueAtLocal)
  }

  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    session: values.session === "all" ? null : values.session,
    submissionKind: values.submissionKind,
    dueAt,
    durationHours: null as number | null,
    restartAvailability: values.restartAvailability || undefined,
    questionConfig: buildQuestionConfigForSave(values),
  }
}

export function formatAssignmentDueLabel(value: string | null | undefined): string {
  if (!value) return "No due date"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
