import { parseLectureSamplePractice } from "./lecture-sample-practice-utils"
import {
  coerceWorkspaceQuestionsArray,
  parseLectureWorkspace,
  parseLectureWorkspaceStudentApiResponse,
  workspaceQuestionsFromRecord,
} from "./lecture-workspace-utils"
import type { LectureSamplePracticeConfig, LectureWorkspaceConfig } from "./lecture-types"
import { mfaTrustRequestHeadersForStudent } from "./mfa-device-trust"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "./student-http-cookies"
import { ApiError, studentApi, type StudentLectureDetail } from "./student-api"
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
  for (const source of sources) {
    const parsed = parseJsonField(source)
    if (!parsed || typeof parsed !== "object") continue
    const record = parsed as Record<string, unknown>
    if (record.config != null) return parseJsonField(record.config)
    if (record.sample_practice != null) return parseJsonField(record.sample_practice)
    if (record.samplePractice != null) return parseJsonField(record.samplePractice)
    if (record.sample_practice_config != null) return parseJsonField(record.sample_practice_config)
    if (record.enabled != null || Array.isArray(record.questions)) return record
  }
  return null
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
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (!options?.webWorkspaceParity) {
    headers["Content-Type"] = "application/json"
    headers["x-student-id"] = session.databaseId
  }

  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(session)
  Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))

  return headers
}

function workspacePayloadHasQuestions(body: unknown): boolean {
  if (!body || typeof body !== "object") return false
  return workspaceQuestionsFromRecord(body as Record<string, unknown>).length > 0
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
  const payloads: unknown[] = [...sources]

  const dedicated = await fetchStudentLectureWorkspacePayload(session, lectureId)
  if (dedicated != null) payloads.unshift(dedicated)

  const viaFetch = await studentLectureFetchJson(
    session,
    `/api/student/lectures/${lectureId}/workspace`,
  )
  if (viaFetch != null && workspacePayloadHasQuestions(viaFetch)) payloads.push(viaFetch)

  try {
    const viaApi = await studentApi.getLectureWorkspace(session, lectureId)
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
    const lectureWorkspace = (summary as Record<string, unknown>).lecture_workspace
    if (lectureWorkspace != null) payloads.unshift(lectureWorkspace)
  }

  for (const payload of payloads) {
    if (payload && typeof payload === "object" && workspacePayloadHasQuestions(payload)) {
      const parsed = parseLectureWorkspaceStudentApiResponse(payload)
      if (parsed.questions.length > 0) return parsed
    }
  }

  for (const payload of payloads) {
    const parsed = parseLectureWorkspace(extractWorkspaceRaw(payload) ?? payload)
    if (parsed.questions.length > 0) return parsed
  }

  if (dedicated != null) {
    return parseLectureWorkspaceStudentApiResponse(dedicated)
  }

  return parseLectureWorkspace(extractWorkspaceRaw(...payloads) ?? payloads[0])
}

export async function fetchStudentLectureSamplePracticeConfig(
  session: StudentSession,
  lectureId: number,
  sources: unknown[] = [],
): Promise<LectureSamplePracticeConfig> {
  const payloads = [...sources]
  const dedicated = await studentLectureFetchJson(
    session,
    `/api/student/lectures/${lectureId}/sample-practice`,
  )
  if (dedicated != null) payloads.push(dedicated)

  const content = await studentLectureFetchJson(
    session,
    `/api/student/lectures/${lectureId}/content`,
  )
  if (content != null) payloads.push(content)

  const detail = await studentLectureFetchJson(session, `/api/student/lectures/${lectureId}`)
  if (detail != null) payloads.push(detail)

  const list = await studentApi.getLectures(session).catch(() => null)
  const summary = list?.lectures?.find((item) => item.id === lectureId)
  if (summary) payloads.push(summary)

  const samplePracticeRaw = extractSamplePracticeRaw(...payloads)
  return parseLectureSamplePractice(samplePracticeRaw)
}

export async function fetchStudentLectureViewerData(
  session: StudentSession,
  lectureId: number,
): Promise<StudentLectureViewerData> {
  const list = await studentApi.getLectures(session)
  const summary = list.lectures?.find((item) => item.id === lectureId) ?? null
  if (!summary) {
    throw new ApiError("This lecture could not be found.", 404)
  }

  let detail: StudentLectureDetail | undefined
  let content: Record<string, unknown> = {}
  let samplePracticePayload: unknown = null
  let workspacePayload: unknown = null

  await Promise.all([
    studentApi
      .getLectureById(session, lectureId)
      .then((response) => {
        detail = response.lecture
      })
      .catch(() => undefined),
    studentApi
      .getLectureContent(session, lectureId)
      .then((response) => {
        content = response
      })
      .catch(() => undefined),
    studentApi
      .getLectureSamplePractice(session, lectureId)
      .then((response) => {
        samplePracticePayload = response
      })
      .catch(() => undefined),
    studentApi
      .getLectureWorkspace(session, lectureId)
      .then((response) => {
        workspacePayload = response
      })
      .catch(() => undefined),
  ])

  const contentLecture =
    content.lecture && typeof content.lecture === "object"
      ? (content.lecture as StudentLectureDetail)
      : undefined

  const lecture = mergeLecture(summary, detail, contentLecture)
  const lectureFields = lectureConfigFields(lecture)
  const samplePracticeRaw = extractSamplePracticeRaw(
    samplePracticePayload,
    content,
    contentLecture,
    detail,
    lectureFields?.sample_practice,
    lectureFields?.sample_practice_config,
    lectureFields?.samplePractice,
    lectureFields?.slides,
  )
  const samplePractice = parseLectureSamplePractice(samplePracticeRaw)
  const workspace = await fetchStudentLectureWorkspaceConfig(session, lectureId, [
    workspacePayload,
    content,
    contentLecture,
    detail,
    lectureFields?.workspace,
    lectureFields?.workspace_config,
    lectureFields?.lecture_workspace,
  ])

  return {
    lecture,
    samplePractice,
    workspace,
    deckUrl: lectureDeckUrl(lecture),
  }
}
