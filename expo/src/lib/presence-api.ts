import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { instructorAuthenticatedHeaders } from "./instructor-api"
import type { MessagesAuth, ParticipantKind } from "./messages-api"
import type {
  ManualPresenceStatus,
  PresenceLastSeenMap,
  PresenceMap,
  PresenceRecord,
} from "./presence/types"
import { presenceKey } from "./presence/types"
import { studentAuthenticatedHeaders } from "./student-api"

async function authHeaders(auth: MessagesAuth): Promise<Record<string, string>> {
  if (auth.kind === "student") {
    return studentAuthenticatedHeaders({ databaseId: auth.databaseId })
  }
  return instructorAuthenticatedHeaders({ instructorId: auth.instructorId })
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function errorMessage(body: unknown, status: number): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error
  }
  return `Request failed (${status})`
}

async function presenceRequest<T>(auth: MessagesAuth, path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const headers: Record<string, string> = {
    ...(await authHeaders(auth)),
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(url, { ...init, credentials: "include", headers })
  const body = await parseJsonResponse(response)
  if (!response.ok) {
    throw new ApiError(errorMessage(body, response.status), response.status, body)
  }
  return body as T
}

export const presenceApi = {
  getSelf(auth: MessagesAuth) {
    return presenceRequest<{ presence: PresenceRecord }>(auth, "/api/presence")
  },

  heartbeat(auth: MessagesAuth) {
    return presenceRequest<{ presence: PresenceRecord }>(auth, "/api/presence", {
      method: "POST",
      body: JSON.stringify({ heartbeat: true }),
    })
  },

  setStatus(auth: MessagesAuth, status: ManualPresenceStatus) {
    return presenceRequest<{ presence: PresenceRecord }>(auth, "/api/presence", {
      method: "POST",
      body: JSON.stringify({ status }),
    })
  },

  resetStatus(auth: MessagesAuth) {
    return presenceRequest<{ presence: PresenceRecord }>(auth, "/api/presence", {
      method: "POST",
      body: JSON.stringify({ reset: true }),
    })
  },

  getBatch(auth: MessagesAuth, participants: Array<{ kind: ParticipantKind; id: number }>) {
    if (participants.length === 0) {
      return Promise.resolve({ statuses: {} as PresenceMap, lastSeenAt: {} as PresenceLastSeenMap })
    }
    const keys = participants.map((p) => presenceKey(p.kind, p.id)).join(",")
    return presenceRequest<{ statuses: PresenceMap; lastSeenAt?: PresenceLastSeenMap }>(
      auth,
      `/api/presence/batch?keys=${encodeURIComponent(keys)}`,
    )
  },
}
