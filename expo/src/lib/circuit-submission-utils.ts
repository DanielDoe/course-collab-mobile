import type { SolutionSubmissionAnswer, SolutionUploadsMap } from "./classroom-submission"
import { listSolutionFiles, parseSolutionAnswer, solutionPartKey } from "./classroom-submission"
import {
  createEmptyWorkspace,
  parseCircuitWorkspace,
  workspaceHasContent,
  type CircuitWorkspace,
} from "./circuit-workspace"

export type CircuitSubmissionConfig = {
  title?: string
  submission_instructions?: string
  max_files?: number
  require_solution_upload?: boolean
  grading_type?: string
}

export type CircuitSubmissionAnswer = SolutionSubmissionAnswer & {
  workspace?: CircuitWorkspace | null
}

export function parseCircuitSubmissionConfig(raw: unknown): CircuitSubmissionConfig {
  if (!raw) return { require_solution_upload: true, max_files: 10 }
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw
    if (!obj || typeof obj !== "object") return { require_solution_upload: true, max_files: 10 }
    const o = obj as Record<string, unknown>
    return {
      title: typeof o.title === "string" ? o.title : undefined,
      submission_instructions:
        typeof o.submission_instructions === "string" ? o.submission_instructions : undefined,
      max_files: typeof o.max_files === "number" ? o.max_files : 10,
      require_solution_upload: o.require_solution_upload !== false,
      grading_type: typeof o.grading_type === "string" ? o.grading_type : undefined,
    }
  } catch {
    return { require_solution_upload: true, max_files: 10 }
  }
}

export function parseCircuitSubmissionAnswer(raw: unknown): CircuitSubmissionAnswer {
  const base = parseSolutionAnswer(typeof raw === "string" ? raw : JSON.stringify(raw ?? {}))
  if (raw == null || raw === "") {
    return { ...base, workspace: null }
  }
  try {
    const obj =
      typeof raw === "string" ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>)
    if (!obj || typeof obj !== "object") return { ...base, workspace: null }

    if (
      !obj.solution_uploads &&
      !obj.workspace &&
      typeof obj.answer === "string" &&
      obj.answer.trim().startsWith("{")
    ) {
      return parseCircuitSubmissionAnswer(obj.answer)
    }

    const parsed = parseSolutionAnswer(JSON.stringify(obj))
    const workspace = parseCircuitWorkspace(obj.workspace)
    return { ...parsed, workspace }
  } catch {
    return { ...base, workspace: null }
  }
}

export function circuitSubmissionFileCount(uploads?: SolutionUploadsMap): number {
  return listSolutionFiles(uploads).length
}

export function circuitSubmissionHasRequiredUpload(
  answerRaw: unknown,
  cfg?: CircuitSubmissionConfig,
): boolean {
  const config = cfg ?? parseCircuitSubmissionConfig(null)
  if (config.require_solution_upload === false) return true
  const parsed = parseCircuitSubmissionAnswer(answerRaw)
  if (circuitSubmissionFileCount(parsed.solution_uploads) >= 1) return true
  if (parsed.submission_mode === "workspace" && workspaceHasContent(parsed.workspace)) return true
  return false
}

export function compactCircuitSubmissionForAutoSave(answer: CircuitSubmissionAnswer): string {
  const payload: CircuitSubmissionAnswer = {
    version: 1,
    submission_status: "draft",
    submission_mode: answer.submission_mode ?? "upload",
    solution_uploads: answer.solution_uploads ?? {},
    written_notes: answer.written_notes,
  }
  if (answer.submission_mode === "workspace" && answer.workspace) {
    payload.workspace = answer.workspace
  }
  return JSON.stringify(payload)
}

export function compactCircuitSubmissionForSubmit(answer: CircuitSubmissionAnswer): string {
  const uploads = answer.solution_uploads ?? {}
  const hasUploads = circuitSubmissionFileCount(uploads) > 0
  if (hasUploads) {
    return JSON.stringify({
      version: 1,
      submission_status: "submitted",
      submission_mode: answer.submission_mode,
      solution_uploads: uploads,
      ...(answer.written_notes?.trim() ? { written_notes: answer.written_notes.trim() } : {}),
    })
  }
  return JSON.stringify({
    ...answer,
    version: 1,
    submission_status: "submitted",
  })
}

export function emptyCircuitSubmissionAnswer(mode: "upload" | "photo" | "workspace" = "upload"): string {
  const ws = mode === "workspace" ? createEmptyWorkspace() : null
  return JSON.stringify({
    version: 1,
    submission_status: "draft",
    submission_mode: mode,
    solution_uploads: {},
    written_notes: "",
    ...(ws ? { workspace: ws } : {}),
  } satisfies CircuitSubmissionAnswer)
}

export { solutionPartKey, listSolutionFiles }
