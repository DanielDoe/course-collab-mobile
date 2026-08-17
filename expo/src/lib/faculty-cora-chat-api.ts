import { API_BASE_URL } from "../constants"
import { abortTimeout } from "./abort-timeout"
import { ApiError } from "./api"
import { apiErrorMessage, isApiRouteMissingError } from "./http-errors"
import type { InstructorScope } from "./instructor-content-api"
import type { FacultyCoraChatThread } from "./faculty-cora-chat-storage"

export type FacultyCoraChatSessionResponse = {
  threads: FacultyCoraChatThread[]
  activeThreadId: string | null
}

export type FacultyCoraChatThreadResponse = {
  thread: FacultyCoraChatThread
  activeThreadId?: string | null
}

async function instructorChatRequest<T>(
  path: string,
  scope: InstructorScope,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-instructor-id": String(scope.instructorId),
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (scope.courseId != null) headers["x-course-id"] = String(scope.courseId)

  const response = await fetch(url, {
    ...init,
    headers,
    body: init?.body,
    signal: init?.signal ?? abortTimeout(12_000),
  })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }
  if (!response.ok) {
    throw new ApiError(apiErrorMessage(body, response.status), response.status, body)
  }
  return body as T
}

export function isFacultyCoraChatHistoryUnavailable(err: unknown): boolean {
  return err instanceof ApiError && isApiRouteMissingError(err.status, err.message)
}

export const facultyCoraChatApi = {
  async listThreads(scope: InstructorScope): Promise<FacultyCoraChatSessionResponse> {
    return instructorChatRequest<FacultyCoraChatSessionResponse>(
      "/api/instructor/cora/threads",
      scope,
    )
  },

  async upsertThread(
    scope: InstructorScope,
    thread: FacultyCoraChatThread,
    opts?: { setActive?: boolean },
  ): Promise<FacultyCoraChatThreadResponse> {
    return instructorChatRequest<FacultyCoraChatThreadResponse>(
      `/api/instructor/cora/threads/${encodeURIComponent(thread.id)}`,
      scope,
      {
        method: "PUT",
        body: JSON.stringify({
          thread,
          setActive: opts?.setActive !== false && !thread.archivedAt,
        }),
      },
    )
  },

  async setActiveThread(scope: InstructorScope, threadId: string): Promise<void> {
    await instructorChatRequest<{ ok: true }>(
      `/api/instructor/cora/threads/${encodeURIComponent(threadId)}`,
      scope,
      {
        method: "PATCH",
        body: JSON.stringify({ setActive: true }),
      },
    )
  },

  async deleteThread(scope: InstructorScope, threadId: string): Promise<void> {
    await instructorChatRequest<{ ok: true }>(
      `/api/instructor/cora/threads/${encodeURIComponent(threadId)}`,
      scope,
      { method: "DELETE" },
    )
  },
}
