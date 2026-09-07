import type { StudentSession } from "./session"
import { normalizePlaygroundQuestions } from "./playground-question-utils"
import { studentAuthenticatedRequest } from "./student-api"
import { studentProjectsListPath } from "./student-content-context"
import { enrichStudentContentSession, studentEnrichedContentPath } from "./student-content-session"

function request<T>(session: StudentSession, path: string, init?: RequestInit): Promise<T> {
  return studentAuthenticatedRequest<T>(session, path, init)
}

async function requestContent<T>(
  session: StudentSession,
  path: string,
  extra?: Record<string, string | number | undefined>,
  init?: RequestInit,
): Promise<T> {
  const enrichedPath = await studentEnrichedContentPath(session, path, extra)
  return request<T>(session, enrichedPath, init)
}

export type ForumThread = {
  id: number
  student_id?: number
  title: string
  description?: string
  code_snippet?: string
  tags?: string[]
  upvotes?: number
  downvotes?: number
  reply_count?: number
  author_name?: string
  author_reputation?: number
  is_anonymous?: boolean
  created_at?: string
  views?: number
}

export type ForumReply = {
  id: number
  thread_id: number
  student_id?: number
  reply_text?: string
  content?: string
  upvotes?: number
  downvotes?: number
  created_at?: string
  author_name?: string
  author_reputation?: number
  is_solution?: boolean
  parent_reply_id?: number
}

export type ForumReputation = {
  points?: number
  badges?: unknown[]
}

export type ForumLeaderboardEntry = {
  student_id: number
  full_name?: string
  student_name?: string
  points: number
  rank?: number
  threads_count?: number
  replies_count?: number
}

export type TutoringOffer = {
  id: number
  student_id?: number
  offer_type?: string
  subject: string
  description?: string
  availability?: string
  contact_method?: string
  tutor_name?: string
  tutor_reputation?: number
  created_at?: string
}

export type RosterStudent = {
  id: number
  student_id: string
  full_name: string
}

export type GroupMember = {
  id: number
  student_id: string
  full_name: string
  joined_at?: string
  membership_id?: number
}

export type GroupRecord = {
  id: number
  name: string
  session?: string
  status?: string
  member_count?: number | string
  leader_name?: string
  leader_student_id?: string
  created_by?: number
  created_at?: string
  members?: GroupMember[]
  pending_changes?: unknown
}

export type OpenCall = {
  id: number
  title: string
  message?: string
  session?: string
  created_at?: string
  group_id?: number | null
  owner_student_id?: number | null
  group_name?: string | null
  owner_name?: string | null
}

export type DiscoverData = {
  openGroups: GroupRecord[]
  studentsWithoutGroup: RosterStudent[]
  openCalls: OpenCall[]
}

export type ProjectRecord = {
  id: number
  group_id?: number
  title: string
  summary?: string
  deliverables?: string
  status?: string
  target_platform?: string
  project_link?: string | null
  rejection_reason?: string | null
  created_at?: string
  updated_at?: string
  group?: { id?: number; name?: string; status?: string; created_by?: number }
  leader?: { id?: number; full_name?: string; student_id?: string }
  members?: Array<{ id?: number; full_name?: string }>
}

export type ProjectReport = {
  id: number
  project_id: number
  progress: string
  challenges?: string | null
  deliverables_status?: string | null
  created_at: string
  student_name?: string
}

export type PlaygroundCredits = {
  credits: number
  tier?: string
  creditsLimit?: number | "unlimited"
  isUnlimited?: boolean
}

export type PlaygroundPersonalStats = {
  bestScore: number
  avgScore: number
  totalGames: number
  recentGames: Array<{
    score: number
    questionsAnswered: number
    correctAnswers: number
    completedAt: string | null
  }>
}

export type PlaygroundJoinResult = {
  sessionId?: number
  resultId?: number
  mode?: "CLASSROOM" | "PERSONAL"
  durationSec?: number
  currentQuestionIndex?: number
  displayName?: string
  waitingRoom?: boolean
  gameStarted?: boolean
  rejoined?: boolean
  redirectUrl?: string
  error?: string
}

export type PlaygroundPracticeSet = {
  id: number
  label: string
  topics: string[]
  questionCount: number
  durationSec: number
}

export type PlaygroundPolicyResponse = {
  policy?: {
    allow_student_nicknames?: boolean
    default_question_count?: number
    default_duration_sec?: number
  }
}

export type PlaygroundQuestion = {
  id: number
  bankQuestionId?: number
  questionText: string
  questionType: string
  options: string[]
  correctAnswer?: unknown
  hint?: string
  difficulty?: string
  topic?: string
}

export type PlaygroundLobbyState = {
  sessionLabel?: string
  sessionCode?: string
  gameStarted?: boolean
  sessionEnded?: boolean
  attemptRevoked?: boolean
  questionCount?: number
  participantCount?: number
  myResult?: {
    resultId: number
    score?: number
    correctAnswers?: number
    attemptComplete?: boolean
    questionsAnswered?: number
    completedAt?: string | null
    inWaitingRoom?: boolean
  } | null
  participants?: Array<{
    resultId: number
    displayName: string
    inWaitingRoom?: boolean
    is_current_user?: boolean
  }>
}

export type PlaygroundLeaderboardEntry = {
  rank: number
  resultId?: number
  sessionId?: number
  mode?: "CLASSROOM" | "PERSONAL"
  displayName: string
  score: number
  correctAnswers?: number
  questionsAnswered?: number
  status?: "waiting" | "playing" | "completed"
  isCurrentUser?: boolean
}

export const collaborationApi = {
  // ── Forum ──
  getForumThreads: (session: StudentSession, params?: { search?: string; sortBy?: "recent" | "popular" }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set("search", params.search)
    if (params?.sortBy) q.set("sortBy", params.sortBy)
    const suffix = q.toString() ? `?${q.toString()}` : ""
    return request<{ threads?: ForumThread[] }>(session, `/api/forum/threads${suffix}`)
  },

  getForumThread: (session: StudentSession, threadId: number) =>
    request<{ thread?: ForumThread }>(session, `/api/forum/threads/${threadId}`),

  createForumThread: (
    session: StudentSession,
    payload: {
      title: string
      description: string
      codeSnippet?: string
      tags?: string[]
      isAnonymous?: boolean
    },
  ) =>
    request<{ thread?: ForumThread }>(session, "/api/forum/threads", {
      method: "POST",
      body: JSON.stringify({
        studentId: Number(session.databaseId),
        title: payload.title,
        description: payload.description,
        codeSnippet: payload.codeSnippet,
        tags: payload.tags ?? [],
        isAnonymous: payload.isAnonymous ?? false})}),

  getForumReplies: (session: StudentSession, threadId: number) =>
    request<{ replies?: ForumReply[] }>(session, `/api/forum/replies?threadId=${threadId}`),

  postForumReply: (session: StudentSession, threadId: number, replyText: string) =>
    request<{ reply?: ForumReply }>(session, "/api/forum/replies", {
      method: "POST",
      body: JSON.stringify({
        threadId,
        studentId: Number(session.databaseId),
        replyText})}),

  voteForum: (
    session: StudentSession,
    payload: { threadId?: number; replyId?: number; voteType: "upvote" | "downvote" },
  ) =>
    request<{ success?: boolean }>(session, "/api/forum/votes", {
      method: "POST",
      body: JSON.stringify({
        studentId: Number(session.databaseId),
        threadId: payload.threadId,
        replyId: payload.replyId,
        voteType: payload.voteType})}),

  getForumReputation: (session: StudentSession) =>
    request<{ reputation?: ForumReputation }>(
      session,
      `/api/forum/reputation?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getForumLeaderboard: (session: StudentSession, sessionId?: number) => {
    const q = sessionId ? `?sessionId=${sessionId}` : ""
    return request<{ weekly?: ForumLeaderboardEntry[]; allTime?: ForumLeaderboardEntry[] }>(
      session,
      `/api/forum/leaderboard${q}`,
    )
  },

  getTutoringOffers: (session: StudentSession) =>
    request<{ offers?: TutoringOffer[] }>(session, "/api/forum/tutoring?status=active"),

  createTutoringOffer: (
    session: StudentSession,
    payload: {
      offerType: "can_tutor" | "need_tutor"
      subject: string
      description?: string
      availability?: string
      contactMethod?: string
    },
  ) =>
    request<{ offer?: TutoringOffer }>(session, "/api/forum/tutoring", {
      method: "POST",
      body: JSON.stringify({
        studentId: Number(session.databaseId),
        offerType: payload.offerType,
        subject: payload.subject,
        description: payload.description,
        availability: payload.availability,
        contactMethod: payload.contactMethod})}),

  // ── Groups ──
  getGroups: (session: StudentSession, status?: string) =>
    requestContent<{ groups?: GroupRecord[] }>(
      session,
      "/api/groups",
      status ? { status } : undefined,
    ),

  getGroup: (session: StudentSession, groupId: number) =>
    request<{ group?: GroupRecord }>(session, `/api/groups/${groupId}`),

  createGroup: (
    session: StudentSession,
    payload: { name: string; initialMembers?: number[] },
  ) =>
    request<{ group?: GroupRecord }>(session, "/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        session: session.section,
        createdBy: Number(session.databaseId),
        initialMembers: payload.initialMembers ?? []})}),

  updateGroup: (session: StudentSession, groupId: number, name: string) =>
    request<{ group?: GroupRecord }>(session, `/api/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify({ name, studentId: Number(session.databaseId) })}),

  deleteGroup: (session: StudentSession, groupId: number) =>
    request<{ success?: boolean }>(session, `/api/groups/${groupId}`, {
      method: "DELETE",
      body: JSON.stringify({ studentId: Number(session.databaseId) })}),

  addGroupMember: (session: StudentSession, groupId: number, studentDbId: number) =>
    request<{ success?: boolean }>(session, "/api/groups/add-member", {
      method: "POST",
      body: JSON.stringify({
        groupId,
        studentId: studentDbId,
        requesterId: Number(session.databaseId)})}),

  removeGroupMember: (session: StudentSession, groupId: number, studentDbId: number) =>
    request<{ success?: boolean }>(session, "/api/groups/remove-member", {
      method: "DELETE",
      body: JSON.stringify({
        groupId,
        studentId: studentDbId,
        requesterId: Number(session.databaseId)})}),

  getGroupsDiscover: (session: StudentSession) =>
    requestContent<{ openGroups?: GroupRecord[]; data?: DiscoverData }>(
      session,
      "/api/groups/requests/discover",
    ).then((body) => ({
      openGroups: body.openGroups ?? body.data?.openGroups ?? [],
      studentsWithoutGroup: body.data?.studentsWithoutGroup ?? [],
      openCalls: body.data?.openCalls ?? []})),

  requestJoinGroup: (session: StudentSession, groupId: number) =>
    request<{ ok?: boolean }>(session, "/api/groups/requests/join", {
      method: "POST",
      body: JSON.stringify({
        groupId,
        requesterStudentId: Number(session.databaseId)})}),

  getRoster: (session: StudentSession) => {
    const q = new URLSearchParams({
      section: session.section,
      studentDatabaseId: session.databaseId})
    if (session.courseId) q.set("courseId", String(session.courseId))
    return request<{ students?: RosterStudent[] }>(session, `/api/student/roster?${q.toString()}`)
  },

  // ── Projects ──
  getProjects: async (session: StudentSession) => {
    const contentSession = await enrichStudentContentSession(session)
    return request<{ projects?: ProjectRecord[] }>(
      session,
      studentProjectsListPath(contentSession),
    )
  },

  getProject: (session: StudentSession, projectId: number) =>
    request<{ project?: ProjectRecord }>(session, `/api/projects/${projectId}`),

  createProject: (
    session: StudentSession,
    payload: {
      groupId: number
      title: string
      summary?: string
      deliverables?: string
      targetPlatform?: string
      projectLink?: string
    },
  ) =>
    request<{ project?: ProjectRecord }>(session, "/api/projects/create", {
      method: "POST",
      body: JSON.stringify({
        groupId: payload.groupId,
        title: payload.title,
        summary: payload.summary,
        deliverables: payload.deliverables,
        targetPlatform: payload.targetPlatform,
        projectLink: payload.projectLink,
        studentId: Number(session.databaseId)})}),

  updateProject: (
    session: StudentSession,
    projectId: number,
    payload: {
      title: string
      summary?: string
      deliverables?: string
      targetPlatform?: string
      projectLink?: string
    },
  ) =>
    request<{ project?: ProjectRecord }>(session, `/api/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...payload,
        studentId: Number(session.databaseId)})}),

  deleteProject: (session: StudentSession, projectId: number) =>
    request<{ success?: boolean }>(session, `/api/projects/${projectId}`, {
      method: "DELETE",
      body: JSON.stringify({ studentId: Number(session.databaseId) })}),

  getProjectReports: (session: StudentSession, projectId: number) =>
    request<{ reports?: ProjectReport[] }>(session, `/api/projects/${projectId}/reports`),

  submitProjectReport: (
    session: StudentSession,
    projectId: number,
    payload: { progress: string; challenges?: string; deliverablesStatus?: string },
  ) =>
    request<{ report?: ProjectReport }>(session, `/api/projects/${projectId}/reports`, {
      method: "POST",
      body: JSON.stringify({
        studentId: Number(session.databaseId),
        progress: payload.progress,
        challenges: payload.challenges,
        deliverablesStatus: payload.deliverablesStatus})}),

  voteProjectStar: (session: StudentSession, projectId: number, rating = 1) =>
    request<{ success?: boolean }>(session, "/api/projects/vote-stars", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        voterId: Number(session.databaseId),
        voterType: "student",
        rating})}),

  getProjectLeaderboard: (session: StudentSession) =>
    request<{ projects?: ProjectRecord[] }>(
      session,
      `/api/projects/leaderboard?session=${encodeURIComponent(session.section)}`,
    ),

  // ── Playground ──
  getPlaygroundCredits: (session: StudentSession) =>
    requestContent<PlaygroundCredits>(session, "/api/playground/credits"),

  getPlaygroundPersonal: (session: StudentSession) =>
    requestContent<PlaygroundPersonalStats>(session, "/api/playground/personal"),

  getPlaygroundPolicy: (session: StudentSession) =>
    requestContent<PlaygroundPolicyResponse>(session, "/api/playground/policy"),

  getPlaygroundPracticeSets: (session: StudentSession) =>
    requestContent<{ practiceSets?: PlaygroundPracticeSet[] }>(
      session,
      "/api/playground/practice-sets",
    ),

  joinPlayground: (
    session: StudentSession,
    payload: {
      mode: "CLASSROOM" | "PERSONAL"
      passcode?: string
      nickname?: string
      practiceSetId?: number
    },
  ) =>
    request<PlaygroundJoinResult>(session, "/api/playground/join", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.id,
        studentName: session.name,
        mode: payload.mode,
        passcode: payload.passcode,
        nickname: payload.nickname,
        practiceSetId: payload.practiceSetId})}),

  getPlaygroundLobby: (session: StudentSession, sessionId: number, resultId: number) =>
    request<PlaygroundLobbyState>(
      session,
      `/api/playground/lobby?sessionId=${sessionId}&resultId=${resultId}&studentId=${encodeURIComponent(session.id)}`,
    ),

  getPlaygroundQuestions: (session: StudentSession, sessionId: number) =>
    request<{ questions?: unknown[] }>(
      session,
      `/api/playground/questions?sessionId=${sessionId}`,
    ).then((res) => ({
      questions: normalizePlaygroundQuestions(res.questions),
    })),

  submitPlaygroundAnswer: (
    session: StudentSession,
    payload: {
      resultId: number
      questionId: number
      selectedAnswer: string | string[]
      timeTaken?: number
      responseTimeMs?: number
      correctAnswer?: unknown
    },
  ) =>
    request<{ isCorrect?: boolean; points?: number; score?: number; correctAnswers?: number; correctAnswer?: unknown; attemptRevoked?: boolean }>(
      session,
      "/api/playground/submit",
      {
      method: "POST",
      body: JSON.stringify(payload)}),

  completePlayground: (session: StudentSession, resultId: number) =>
    request<{ success?: boolean; score?: number; correctAnswers?: number }>(session, "/api/playground/complete", {
      method: "POST",
      body: JSON.stringify({ resultId })}),

  getPlaygroundLeaderboard: (session: StudentSession, sessionId: number) =>
    request<{
      leaderboard?: PlaygroundLeaderboardEntry[]
      session?: { isActive: boolean; gameStarted: boolean }
      leaderboardFinalized?: boolean
    }>(
      session,
      `/api/playground/leaderboard?sessionId=${sessionId}&studentId=${encodeURIComponent(session.databaseId)}`,
    ),
}

export function formatRelativeTime(value?: string): string {
  if (!value) return "Recently"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function statusTone(status?: string): { bg: string; text: string; label: string } {
  const s = (status ?? "").toLowerCase()
  if (s === "approved" || s === "active" || s === "completed") {
    return { bg: "rgba(34,197,94,0.12)", text: "#166534", label: status ?? "Active" }
  }
  if (s === "pending" || s === "draft") {
    return { bg: "rgba(234,170,0,0.14)", text: "#92400e", label: status ?? "Pending" }
  }
  if (s === "rejected") {
    return { bg: "rgba(239,68,68,0.12)", text: "#b91c1c", label: "Rejected" }
  }
  return { bg: "rgba(100,116,139,0.12)", text: "#475569", label: status ?? "—" }
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
