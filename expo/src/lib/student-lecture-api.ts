import {
  parseLectureSamplePractice,
  parseLectureSamplePracticeStudentApiResponse,
  samplePracticePayloadHasQuestions,
  samplePracticeQuestionsFromRecord,
} from "./lecture-sample-practice-utils"
import {
  coerceWorkspaceQuestionsArray,
  parseLectureWorkspace,
  parseLectureWorkspaceStudentApiResponse,
  unwrapLectureWorkspacePayload,
  workspacePayloadHasQuestions,
  workspaceQuestionsFromRecord,
} from "./lecture-workspace-utils"
import type { LectureSamplePracticeConfig, LectureSamplePracticeStudentState, LectureWorkspaceConfig } from "./lecture-types"
import { persistHttpCookiesFromResponse } from "./student-http-cookies"
import { ApiError, studentApi, studentAuthenticatedHeaders, type StudentLectureDetail } from "./student-api"
import type { StudentSession } from "./session"
import { API_BASE_URL } from "../constants"

export type StudentLectureViewerData = {
  lecture: StudentLectureDetail
  samplePractice: LectureSamplePracticeConfig
  workspace: LectureWorkspaceConfig
  deckUrl: string | null
}

function lectureDeckUrl(lecture: StudentLectureDetail): string | null {
  return lecture.pdf_url || lecture.document_url || lecture.original_file_url || null
}

function mergeLecture(
  summary: StudentLectureDetail,
  ...extras: Array<Partial<StudentLectureDetail> | undefined>
): StudentLectureDetail {
  return Object.assign({}, summary, ...extras.filter(Boolean)) as StudentLectureDetail
}

function parseJsonField(raw: unknown): unknown {
  if (typeof raw !== "string" || !raw.trim()) return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function lectureConfigFields(source: unknown): Record<string, unknown> | null {
  if (!source || typeof source !== "object") return null
  return source as Record<string, unknown>
}

function extractSamplePracticeRaw(...sources: unknown[]): unknown {
  let fallback: unknown = null
  for (const source of sources) {
    const parsed = parseJsonField(source)
    if (!parsed || typeof parsed !== "object") continue
    const record = parsed as Record<string, unknown>
    const candidates: Record<string, unknown>[] = [record]
    for (const key of ["config", "sample_practice", "samplePractice", "sample_practice_config"] as const) {
      const nested = parseJsonField(record[key])
      if (nested && typeof nested === "object") {
        candidates.push(nested as Record<string, unknown>)
      }
    }
    for (const candidate of candidates) {
      const questions = samplePracticeQuestionsFromRecord(candidate)
      if (questions.length > 0) {
        return { ...candidate, questions }
      }
      if (
        fallback == null &&
        (candidate.enabled != null || Array.isArray(candidate.questions))
      ) {
        fallback = { ...candidate, questions }
      }
    }
  }
  return fallback
}

function workspaceCandidateRecords(source: unknown): Record<string, unknown>[] {
  const parsed = parseJsonField(source)
  if (!parsed || typeof parsed !== "object") return []
  const record = parsed as Record<string, unknown>
  const candidates: unknown[] = [
    record.config,
    record.workspace,
    record.workspace_config,
    record.lecture_workspace,
    record,
  ]
  const records: Record<string, unknown>[] = []
  for (const candidate of candidates) {
    const next = parseJsonField(candidate)
    if (next && typeof next === "object") {
      records.push(next as Record<string, unknown>)
    }
  }
  return records
}

function extractWorkspaceRaw(...sources: unknown[]): unknown {
  let fallback: unknown = null
  for (const source of sources) {
    for (const record of workspaceCandidateRecords(source)) {
      const questions = workspaceQuestionsFromRecord(record)
      if (questions.length > 0) {
        return { ...record, questions }
      }
      if (
        fallback == null &&
        (record.enabled != null ||
          Array.isArray(record.questions) ||
          Array.isArray(record.problems))
      ) {
        fallback = { ...record, questions }
      }
    }
  }
  return fallback
}

async function studentLectureRequestHeaders(
  session: StudentSession,
  options?: { webWorkspaceParity?: boolean },
): Promise<Record<string, string>> {
  const headers = await studentAuthenticatedHeaders(session)
  if (options?.webWorkspaceParity) {
    delete headers["Content-Type"]
    delete headers["x-student-id"]
  }
  return headers
}

function pickBestWorkspaceConfig(payloads: unknown[]): LectureWorkspaceConfig {
  let best = parseLectureWorkspaceStudentApiResponse(null)
  for (const payload of payloads) {
    if (payload == null) continue
    const parsed = parseLectureWorkspaceStudentApiResponse(payload)
    if (parsed.questions.length > best.questions.length) {
      best = parsed
    }
  }
  return best
}

function isSamplePracticeOnlyPayload(body: unknown): boolean {
  if (!body || typeof body !== "object") return false
  if (workspacePayloadHasQuestions(body)) return false

  const record = body as Record<string, unknown>
  if (
    "workspace" in record ||
    "lecture_workspace" in record ||
    "workspace_config" in record
  ) {
    return false
  }

  if ("sample_practice" in record || "samplePractice" in record) {
    return samplePracticePayloadHasQuestions(body)
  }

  const questions = samplePracticeQuestionsFromRecord(record)
  if (questions.length === 0) return false
  return true
}

function appendWorkspacePayloadSources(payloads: unknown[], source: unknown): void {
  if (source == null) return
  payloads.push(unwrapLectureWorkspacePayload(source))
  if (typeof source !== "object") return

  const record = source as Record<string, unknown>
  for (const key of ["workspace", "lecture_workspace", "workspace_config"] as const) {
    if (record[key] != null) {
      payloads.push(unwrapLectureWorkspacePayload(record[key]))
    }
  }

  const lecture = record.lecture
  if (lecture && typeof lecture === "object") {
    const lectureRecord = lecture as Record<string, unknown>
    for (const key of ["workspace", "lecture_workspace", "workspace_config"] as const) {
      if (lectureRecord[key] != null) {
        payloads.push(unwrapLectureWorkspacePayload(lectureRecord[key]))
      }
    }
  }
}

function bundledWorkspaceSource(bundled: Record<string, unknown>): unknown {
  return bundled.workspace ?? bundled.lecture_workspace
}

function isWorkspaceOnlyPayload(body: unknown): boolean {
  if (!body || typeof body !== "object") return false
  const record = body as Record<string, unknown>
  if ("lecture_workspace" in record || "workspace_config" in record) return true
  if ("workspace" in record && !("sample_practice" in record) && !("samplePractice" in record)) {
    return workspacePayloadHasQuestions(body)
  }
  return false
}

async function fetchStudentLectureWorkspacePayload(
  session: StudentSession,
  lectureId: number,
): Promise<unknown | null> {
  const studentIds = [...new Set([session.id, session.databaseId].filter(Boolean))]
  let fallback: unknown | null = null

  for (const studentId of studentIds) {
    const params = new URLSearchParams({ studentId })
    if (session.courseId != null && Number.isFinite(session.courseId)) {
      params.set("courseId", String(session.courseId))
    }
    const url = `${API_BASE_URL}/api/student/lectures/${lectureId}/workspace?${params.toString()}`
    try {
      // Match web lecture viewer: roster id in query, session cookies, no x-student-id header.
      const response = await fetch(url, {
        headers: await studentLectureRequestHeaders(session, { webWorkspaceParity: true }),
        cache: "no-store",
        credentials: "include",
      })
      if (!response.ok) continue
      const text = await response.text()
      if (!text.trim()) continue
      const body = JSON.parse(text) as unknown
      if (
        body &&
        typeof body === "object" &&
        typeof (body as { error?: unknown }).error === "string" &&
        !workspacePayloadHasQuestions(body)
      ) {
        continue
      }
      if (workspacePayloadHasQuestions(body)) {
        await persistHttpCookiesFromResponse(url, response.headers)
        return body
      }
      if (fallback == null && body && typeof body === "object") fallback = body
      await persistHttpCookiesFromResponse(url, response.headers)
    } catch {
      continue
    }
  }

  return fallback
}

async function studentLectureFetchJson(
  session: StudentSession,
  path: string,
): Promise<unknown | null> {
  const studentIds = [...new Set([session.id, session.databaseId].filter(Boolean))]

  for (const studentId of studentIds) {
    const params = new URLSearchParams({ studentId })
    if (session.courseId != null && Number.isFinite(session.courseId)) {
      params.set("courseId", String(session.courseId))
    }
    const separator = path.includes("?") ? "&" : "?"
    const url = `${API_BASE_URL}${path}${separator}${params.toString()}`
    try {
      const response = await fetch(url, {
        headers: await studentLectureRequestHeaders(session),
        cache: "no-store",
        credentials: "include",
      })
      if (!response.ok) continue
      const text = await response.text()
      if (!text.trim()) continue
      const body = JSON.parse(text) as unknown
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error?: unknown }).error === "string" &&
        !("questions" in body)
      ) {
        continue
      }
      await persistHttpCookiesFromResponse(url, response.headers)
      return body
    } catch {
      continue
    }
  }
  return null
}

export async function fetchStudentLectureWorkspaceConfig(
  session: StudentSession,
  lectureId: number,
  sources: unknown[] = [],
): Promise<LectureWorkspaceConfig> {
  const payloads: unknown[] = sources
    .filter((source) => source != null)
    .map((source) => unwrapLectureWorkspacePayload(source))

  const dedicated = await fetchStudentLectureWorkspacePayload(session, lectureId)
  if (dedicated != null) payloads.unshift(unwrapLectureWorkspacePayload(dedicated))

  const viaFetch = await studentLectureFetchJson(
    session,
    `/api/student/lectures/${lectureId}/workspace`,
  )
  if (viaFetch != null) payloads.push(unwrapLectureWorkspacePayload(viaFetch))

  try {
    const viaApi = await studentApi.getLectureWorkspace(session, lectureId)
    payloads.push(unwrapLectureWorkspacePayload(viaApi))
  } catch {
    /* fall through */
  }

  const content = await studentLectureFetchJson(
    session,
    `/api/student/lectures/${lectureId}/content`,
  )
  if (content != null) appendWorkspacePayloadSources(payloads, content)

  const detail = await studentLectureFetchJson(session, `/api/student/lectures/${lectureId}`)
  if (detail != null) appendWorkspacePayloadSources(payloads, detail)

  const list = await studentApi.getLectures(session).catch(() => null)
  const summary = list?.lectures?.find((item) => item.id === lectureId)
  if (summary) {
    appendWorkspacePayloadSources(payloads, summary)
  }

  const eligible = payloads.filter(
    (payload) => payload != null && !isSamplePracticeOnlyPayload(payload),
  )
  const draftMaps = eligible.map((payload) => parseLectureWorkspaceStudentApiResponse(payload).drafts ?? {})
  const drafts = Object.assign({}, ...draftMaps) as Record<string, string>
  const best = pickBestWorkspaceConfig(eligible)
  if (best.questions.length > 0) return { ...best, drafts }

  if (dedicated != null) {
    return {
      ...parseLectureWorkspaceStudentApiResponse(unwrapLectureWorkspacePayload(dedicated)),
      drafts,
    }
  }

  return { ...parseLectureWorkspace(extractWorkspaceRaw(...payloads) ?? payloads[0]), drafts }
}

export async function fetchStudentLectureSamplePracticeState(
  session: StudentSession,
  lectureId: number,
): Promise<LectureSamplePracticeStudentState> {
  const dedicated = await studentLectureFetchJson(
    session,
    `/api/student/lectures/${lectureId}/sample-practice`,
  )
  if (dedicated != null) {
    const parsed = parseLectureSamplePracticeStudentApiResponse(dedicated)
    if (parsed.questions.length > 0) return parsed
  }

  try {
    const viaApi = await studentApi.getLectureSamplePractice(session, lectureId)
    const parsed = parseLectureSamplePracticeStudentApiResponse(viaApi)
    if (parsed.questions.length > 0) return parsed
  } catch {
    /* fall through */
  }

  const config = await fetchStudentLectureSamplePracticeConfig(session, lectureId, [])
  return { ...config, attempts: [] }
}

export async function fetchStudentLectureSamplePracticeConfig(
  session: StudentSession,
  lectureId: number,
  sources: unknown[] = [],
): Promise<LectureSamplePracticeConfig> {
  const payloads: unknown[] = [...sources]

  const dedicated = await studentLectureFetchJson(
    session,
    `/api/student/lectures/${lectureId}/sample-practice`,
  )
  if (dedicated != null) payloads.unshift(dedicated)

  try {
    const viaApi = await studentApi.getLectureSamplePractice(session, lectureId)
    payloads.push(viaApi)
  } catch {
    /* fall through */
  }

  const content = await studentLectureFetchJson(
    session,
    `/api/student/lectures/${lectureId}/content`,
  )
  if (content != null) payloads.push(content)

  const detail = await studentLectureFetchJson(session, `/api/student/lectures/${lectureId}`)
  if (detail != null) payloads.push(detail)

  const list = await studentApi.getLectures(session).catch(() => null)
  const summary = list?.lectures?.find((item) => item.id === lectureId)
  if (summary) {
    payloads.push(summary)
    const embedded = (summary as Record<string, unknown>).sample_practice
    if (embedded != null) payloads.unshift(embedded)
  }

  for (const payload of payloads) {
    if (!payload || typeof payload !== "object" || isWorkspaceOnlyPayload(payload)) continue
    if (samplePracticePayloadHasQuestions(payload)) {
      const parsed = parseLectureSamplePracticeStudentApiResponse(payload)
      if (parsed.questions.length > 0) return parsed
    }
  }

  for (const payload of payloads) {
    if (!payload || typeof payload === "object" && isWorkspaceOnlyPayload(payload)) continue
    const parsed = parseLectureSamplePractice(extractSamplePracticeRaw(payload) ?? payload)
    if (parsed.questions.length > 0) return parsed
  }

  if (dedicated != null) {
    return parseLectureSamplePracticeStudentApiResponse(dedicated)
  }

  return parseLectureSamplePractice(extractSamplePracticeRaw(...payloads) ?? payloads[0])
}

function bundledSamplePracticeSource(bundled: Record<string, unknown>): unknown {
  return bundled.samplePractice ?? bundled.sample_practice
}

export async function fetchStudentLectureViewerData(
  session: StudentSession,
  lectureId: number,
): Promise<StudentLectureViewerData> {
  let lecture: StudentLectureDetail
  let deckUrl: string | null = null
  const samplePracticeSources: unknown[] = []
  const workspaceSources: unknown[] = []

  try {
    const bundled = await studentApi.getLectureViewer(session, lectureId)
    if (!bundled.lecture) {
      throw new ApiError("This lecture could not be found.", 404)
    }
    lecture = bundled.lecture
    deckUrl = bundled.deckUrl || lectureDeckUrl(lecture)
    const bundledRecord = bundled as Record<string, unknown>
    const lectureFields = lectureConfigFields(bundled.lecture)
    samplePracticeSources.push(
      bundledSamplePracticeSource(bundledRecord),
      lectureFields?.sample_practice,
    )
    workspaceSources.push(
      unwrapLectureWorkspacePayload(bundledWorkspaceSource(bundledRecord)),
      unwrapLectureWorkspacePayload(lectureFields?.workspace),
      unwrapLectureWorkspacePayload(lectureFields?.lecture_workspace),
    )
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error

    const detailPayload = await studentLectureFetchJson(
      session,
      `/api/student/lectures/${lectureId}`,
    )
    const detailLecture =
      detailPayload &&
      typeof detailPayload === "object" &&
      "lecture" in detailPayload &&
      detailPayload.lecture &&
      typeof detailPayload.lecture === "object"
        ? (detailPayload.lecture as StudentLectureDetail)
        : detailPayload && typeof detailPayload === "object" && "id" in detailPayload
          ? (detailPayload as StudentLectureDetail)
          : null
    if (!detailLecture) {
      throw new ApiError("This lecture could not be found.", 404)
    }
    lecture = detailLecture
    deckUrl = lectureDeckUrl(lecture)
    const lectureFields = lectureConfigFields(lecture)
    samplePracticeSources.push(lectureFields?.sample_practice)
    workspaceSources.push(
      unwrapLectureWorkspacePayload(lectureFields?.workspace),
      unwrapLectureWorkspacePayload(lectureFields?.lecture_workspace),
    )
  }

  const [samplePractice, workspace] = await Promise.all([
    fetchStudentLectureSamplePracticeConfig(session, lectureId, samplePracticeSources),
    fetchStudentLectureWorkspaceConfig(session, lectureId, workspaceSources),
  ])

  return {
    lecture,
    samplePractice,
    workspace,
    deckUrl,
  }
}
