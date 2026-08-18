# Messages — Student Mobile Production Audit

```
MODULE: Messages
STUDENT ROUTE: /module/messages
NAVIGATION GROUP: Collaboration. student-nav id messages, label Messages, icon mail-outline. No minTier / locked.
REGISTRY ENTRY: faculty-registry messages → FacultyMessagesScreen → MessagesInboxScreen
  student/guest/summer registries → same MessagesInboxScreen
PRIMARY SCREEN: expo/src/components/messages/MessagesInboxScreen.tsx
RELATED SCREENS: MessagesThreadScreen, MessagesComposeModal, MessageComposerBar, MessageActionSheet, MessageParticipantProfileSheet
SUBROUTES: /messages/[id]
API ROUTES:
  GET|POST /api/messages/threads
  GET|POST /api/messages/threads/:threadId
  POST /api/messages/threads/:threadId/unread  ← client calls; route MISSING (404)
  PATCH|DELETE /api/messages/threads/:threadId/messages/:messageId
  POST …/reactions
  GET /api/messages/recipients?q=
  GET /api/messages/participants/:kind/:id/profile
  POST /api/messages/attachments
SERVICES: expo/src/lib/messages-api.ts (header-only). Faculty instructorRequest is NOT used.
DATABASE MODELS: UNVERIFIED directly. Inferred: dm_threads, dm_participants, dm_messages, dm_message_attachments, dm_message_edits, dm_message_hidden
MEMBERSHIP: Unlocked all student tiers
CORA INTEGRATION: send-instructor-message service exists; mobile inbox does not invoke Cora
FACULTY DEPENDENCY: Faculty Expo Messages is the same inbox + compose + thread as student
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: v0 MessagesInbox.tsx
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: working tree  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Messages**. Scope is Faculty Expo Messages plus required backend and student Messages downstream (shared screen).

Execution: production HTTPS probes + source read. Simulator UI: **UNVERIFIED** this run.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **42/100**  
Blockers: 0  
Critical: 2 (M2 header-as-login, M3 global directory)  
High: 2 (M1 client, M4 inverted profile ACL)  
Medium: 2 (M5 missing unread route, M7 no production script)  
Low: 1 (M6 swallowed focus refresh)

Faculty and student share one inbox. The mobile client sends only `x-student-id` / `x-instructor-id`. Production `resolveMessageActor` treats those headers as a login.

**Proved live:** header-only instructor **15** and student **722** list threads (200). Header-only recipient search returns emails for Alex Rivera, Alexa Resendiz, multiple Daniel Doe rows, and Jordan Lee. Header-only instructor can load Alex Rivera’s profile (email, student ID, section, membership). Unauth threads is 401. `POST …/unread` is 404 HTML.

---

## Architecture

Faculty Drawer (`Communication` → Messages)  
→ `/module/messages`  
→ `FacultyMessagesScreen` → `MessagesInboxScreen`  
→ compose / thread / profile  
→ `messagesApi` → header-only fetch  
→ `resolveMessageActor` (header identity)  
→ dm_* tables  

Student Drawer uses the same inbox and the same API.

---

## Files Inspected

- `expo/src/components/faculty/FacultyMessagesScreen.tsx`
- `expo/src/components/messages/MessagesInboxScreen.tsx`
- `expo/src/components/messages/MessagesThreadScreen.tsx`
- `expo/src/components/messages/MessagesComposeModal.tsx`
- `expo/src/lib/messages-api.ts`
- `v0-coursecollabv3/lib/direct-messages/auth.ts`
- `v0-coursecollabv3/lib/direct-messages/service.ts` `searchMessageRecipients`
- `v0-coursecollabv3/lib/direct-messages/participant-profile.ts` `assertActorCanViewParticipantProfile`
- `v0-coursecollabv3/app/api/messages/threads/route.ts` and related routes
- `v0-coursecollabv3/lib/instructor-session-auth.ts` / `lib/student-api-auth.ts` (exist, unused by messages)

---

## Production probes (2026-08-18)

| Probe | Result |
|-------|--------|
| `GET /api/messages/threads` no headers | **401** Unauthorized |
| `GET /api/messages/threads` `x-student-id: 910000001` | **200** `{ threads: [] }` |
| `GET /api/messages/threads` `x-student-id: 722` | **200** `{ threads: [] }` |
| `GET /api/messages/threads` `x-instructor-id: 15` | **200** `{ threads: [] }` |
| `GET /api/messages/recipients?q=Alex` instructor header | **200** emails for 722, 734, 613 |
| `GET /api/messages/recipients?q=dan` student 722 header | **200** emails including `danieldoe33@gmail.com`, `dmdoe@pvamu.edu`, Jordan Lee |
| `GET /api/messages/participants/student/722/profile` instructor header | **200** email + student ID + section + membership |
| `GET /api/messages/threads/1` student 722 | **404** Thread not found (participation check works when actor is bound) |
| `POST /api/messages/threads/1/unread` | **404** (no route) |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected file | Required fix |
|----|----------|------|---------|----------|---------------|--------------|
| **M1** | HIGH | Mobile client | `messagesRequest` / `uploadAttachment` send only `x-student-id` or `x-instructor-id`. No cookies, MFA, refresh, `credentials: "include"`, or HTTPS assert. Faculty `instructorRequest` already fail-closes; Messages does not use it. | `messages-api.ts` L121–187, L295–316 | `expo/src/lib/messages-api.ts` | Attach session proof. Student/guest/summer: `studentAuthenticatedRequest` / `studentAuthenticatedHeaders`. Faculty: same cookie+MFA+`headersHaveStudentSessionProof` pattern as `instructorRequest` L1502–1512. Fail closed. No header-only fallback. |
| **M2** | CRITICAL | Backend auth | `resolveMessageActor` returns a student from `x-student-id` via `resolveStudentDatabaseIdFromParam`, or an instructor from `x-instructor-id` via `loadInstructorActor`, with **no session**. All message routes use this. | `auth.ts` L7–24; live 200s | `v0-coursecollabv3/lib/direct-messages/auth.ts` | Student: `requireBoundStudentCaller`. Instructor: `requireInstructorSession` then `loadInstructorActor(session.instructorId)`. Header is a claim only. |
| **M3** | CRITICAL | Privacy | `searchMessageRecipients` ILIKE-searches **all** `students` and `instructors` and returns emails. Works with header-only (M2). Not course-scoped. | `service.ts` L212–287; live Alex/dan dumps | `v0-coursecollabv3/lib/direct-messages/service.ts` | After M2, restrict students to same-course roster; faculty to their courses. Do not return emails for users outside that scope. |
| **M4** | HIGH | Backend ACL | `assertActorCanViewParticipantProfile`: if no shared thread, it still `loadParticipantProfile` and **returns** when the user exists. Header-only instructor 15 loaded Alex 722’s profile. | `participant-profile.ts` L145–169; live 200 | same file | If no shared thread, deny (403). Do not load-and-allow. |
| **M5** | MEDIUM | API gap | Client `POST /api/messages/threads/:id/unread`. No route. Production 404. Thread UI treats 404 as local-only mark. | `messages-api.ts` L256–259; thread L389–402; probe 404 | add `v0-coursecollabv3/app/api/messages/threads/[threadId]/unread/route.ts` + service that nulls `dm_participants.last_read_at` for the actor | Implement for real, using `resolveMessageActor` after M2. |
| **M6** | LOW | Faculty/student UX | Focus refresh swallows load errors. Pull-to-refresh already surfaces them. | `MessagesInboxScreen.tsx` L97, L130 | same file | `catch` → `setError(presentApiError(...))` like `handleRefresh`. |
| **M7** | MEDIUM | Tests | No `audit:messages-production` script. | glob miss | `expo/scripts/audit-messages-production.mjs` + package.json | Fail on header-only student/instructor GET 200. Unauth must be 401. Do not invent cookies. Do not mark send E2E pass without session. |

---

## Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 90 |
| Shared inbox UI | 82 |
| Mobile API client | 22 |
| Auth (production) | 18 |
| Recipient privacy | 15 |
| Thread participation (once actor bound) | 80 |
| CRUD | 70 |
| Testing | 25 |

**Overall Module Score:** 42/100  

**Final Status:** BLOCKED BY SECURITY / DATA ISSUE  

**Audited at:** 2026-08-18T03:25:00.000Z
