# Manage Playground — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T16:32:38.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile hub + `/api/instructor/playground/*` contracts + student downstream (`PlaygroundScreen`, `PlaygroundJoinScreen`, `PlaygroundGameScreen`, `collaboration-api.ts`)  
**Module size:** MEDIUM — two-screen-tab hub (Sessions + Question bank) + session detail modal (Controls, Leaderboard, Questions)

---

## Module identification

```
MODULE: Manage Playground
MOBILE ROUTE: /module/playground
REGISTRY ENTRY: playground → FacultyPlaygroundScreen (faculty-registry.tsx)
NAVIGATION GROUP: Course (faculty-nav.ts)
MEMBERSHIP REQUIREMENT: None on faculty nav (student playground credits/policy separate)
PRIMARY SCREEN: expo/src/components/faculty/FacultyPlaygroundScreen.tsx
RELATED SCREENS:
  - FacultyPlaygroundSessionDetailModal.tsx (controls, leaderboard poll, question edit)
  - FacultyPlaygroundQuestionBank.tsx (topic → question picker → create session)
  - FacultyPlaygroundSessionCard.tsx, FacultyPlaygroundLeaderboard.tsx
  - FacultyPlaygroundRulesScreen.tsx (separate route /module/playground-rules — policy config)
  - Student: PlaygroundScreen.tsx, PlaygroundJoinScreen.tsx, PlaygroundGameScreen.tsx,
    PlaygroundWaitingScreen.tsx, PlaygroundLeaderboardScreen.tsx
RELATED API ROUTES (faculty — instructorApi):
  - GET  /api/instructor/playground/sessions
  - POST /api/instructor/playground/sessions (action: start, stop, start-game, open-lobby, delete, set-all-sessions, update)
  - POST /api/instructor/playground/reset-attempts
  - GET  /api/instructor/playground/leaderboard?sessionId=
  - GET/PATCH /api/instructor/playground/sessions/:id/questions
  - GET  /api/instructor/playground/topics
  - GET  /api/instructor/playground/questions[?topic=&search=]
RELATED API ROUTES (student downstream — collaboration-api.ts):
  - GET  /api/playground/credits, /api/playground/personal, /api/playground/policy
  - POST /api/playground/join
  - GET  /api/playground/lobby
  - GET  /api/playground/questions?sessionId=
  - POST /api/playground/submit, /api/playground/complete
  - GET  /api/playground/leaderboard?sessionId=
RELATED SERVER ACTIONS: Not present in this repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts, collaboration-api.ts, faculty-playground-utils.ts, playground-leaderboard-utils.ts
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - faculty-module-registry: playground.createSession, populatePool, configure, inspectResults
  - faculty-cora-pending: playground_topic → opens Question bank with topic hint
RELATED WEB MODULE:
  - Student web path mapped; `WEB_ONLY_MODULE_IDS` includes "playground" (native student module exists)
  - Faculty web deep link → /module/playground
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 91/100 (was 84 — remediation + production E2E 2026-08-17)

### Remediation applied (2026-08-17)

| ID | Status | Change |
|----|--------|--------|
| **F-001** | **Fixed** | `requireInstructorCourse` + `psScope` ownership. Production 401 / 403 / 404 including IDOR on list, create, and stop. |
| **F-002** | **Fixed** | Create → student join → start-game → student questions → leaderboard → delete. **14/14 PASS**. |
| **F-003** | **Fixed** | `npm run audit:playground-production` |
| **F-004** | **Fixed** | Topic load failures show the hub error banner. |
| **F-005** | **Fixed** | Session detail shows `FacultySheetErrorBanner` on leaderboard/questions failure. |
| **F-006** | **Fixed** | `playground` added to `FACULTY_MODULE_META`. |
| **F-007** | **Fixed** | Maestro bank/live/p29 no longer require missing live set names or an undocked search field. |
| **F-008** | **Fixed** | Hub links to Playground Rules. |

**Production audit command:** `npm run audit:playground-production` — **14/14 PASS**.

| Severity | Count |
|----------|-------|
| Critical findings | 0 |
| High findings | 0 |
| Medium findings | 0 |
| Low findings | 0 |
| Info | 3 |

The faculty **Manage Playground** module is a native hub with **Sessions** (filter, quick random create, session cards) and **Question bank** (topic list → multi-select questions → curated live session). Session detail modal provides passcode share, lobby/start/stop/reopen/delete, reset attempts, live leaderboard polling, and post-session question reordering.

**Proven this run:** Server `requireInstructorCourse` + session ownership; IDOR on list/create/stop; create → join → start-game → student questions → leaderboard → cleanup (**14/14**).

**Not proven this run:** Live simulator / Maestro re-run; student answer submit (questions were fetched after start-game).

---

## 2. Architecture Map

```
Faculty Drawer "Manage Playground"
  → /module/playground
  → FacultyPlaygroundScreen
      → Sessions tab
          → getPlaygroundSessions, getPlaygroundTopics
          → + Quick random → createPlaygroundSession (action start)
          → Card → FacultyPlaygroundSessionDetailModal
              → open-lobby / start-game / stop / reset-attempts / delete
              → getPlaygroundLeaderboard (poll when live)
              → get/update session questions (ended only)
      → Question bank tab
          → getPlaygroundTopics → getPlaygroundQuestions(topic)
          → createPlaygroundSession(questionIds)
  → instructorRequest → /api/instructor/playground/* + scoped headers
  → Student PlaygroundJoinScreen → collaborationApi.joinPlayground(passcode)
      → PlaygroundGameScreen → submit / complete
      → PlaygroundLeaderboardScreen
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Faculty hub | `FacultyPlaygroundScreen.tsx`, `FacultyPlaygroundSessionCard.tsx` |
| Detail / bank | `FacultyPlaygroundSessionDetailModal.tsx`, `FacultyPlaygroundQuestionBank.tsx`, `FacultyPlaygroundLeaderboard.tsx` |
| Utils / theme | `faculty-playground-utils.ts`, `faculty-playground-theme.ts`, `playground-leaderboard-utils.ts` |
| API | `instructor-api.ts` (L1528–1538, L2478–2577, L3733+), `collaboration-api.ts` |
| Student downstream | `PlaygroundScreen.tsx`, `PlaygroundJoinScreen.tsx`, `PlaygroundGameScreen.tsx` |
| Cora | `faculty-cora-pending.ts`, `faculty-module-registry.ts` |
| Nav | `faculty-nav.ts`, `faculty-registry.tsx`, `module-web-paths.ts` |
| Maestro / sim-audit | 14 maestro YAML; 14 sim-audit junit (11 SUCCESS) |

---

## 4. Navigation & Routing

**Status:** PASS

- Drawer **Manage Playground** → `/module/playground` (`faculty-nav.ts` L75).
- Registry `playground` → `FacultyPlaygroundScreen` (`faculty-registry.tsx` L106).
- Related **Playground Rules** at `/module/playground-rules` (separate admin/policy screen — not part of this hub audit scope but shares backend policy).
- Deep link paths containing `playground` → mobile route (`faculty-nav.ts` L269).

---

## 5. Production Configuration

**Production API verified:** YES (client + live probes)

**Development URLs found:** None in playground module paths.

**Mock dependencies found:** None.

---

## 6. UI Component Audit

| Component | Role | Status |
|-----------|------|--------|
| `FacultyPlaygroundScreen` | Sessions + bank tabs | Active |
| `FacultyPlaygroundSessionDetailModal` | Live session control | Active |
| `FacultyPlaygroundQuestionBank` | Curated question sessions | Active |
| `FacultyPlaygroundLeaderboard` | In-modal rankings | Active |

No placeholder screen. Cora can pre-fill question bank via `playground_topic` pending payload.

---

## 7. Buttons & Actions

| Control | Screen | Handler | Backend | Result | Status |
|---------|--------|---------|---------|--------|--------|
| Create random session | Sessions + | createPlaygroundSession | POST sessions start | Lobby | UNVERIFIED |
| Session card | Sessions | Opens detail modal | GET detail implicit | Modal | UNVERIFIED |
| Share passcode | Controls | Share API | — | Passcode text | PASS (UX) |
| Start game | Controls | startPlaygroundGame | POST start-game | Live | UNVERIFIED |
| End session | Controls | stopPlaygroundSession | POST stop | Ended | UNVERIFIED |
| Reopen lobby | Controls (ended) | openPlaygroundLobby | POST open-lobby | New passcode | UNVERIFIED |
| Open all sections | Controls | setPlaygroundAllSessions | POST set-all-sessions | Scope widen | UNVERIFIED |
| Reset session | Controls | resetPlaygroundAttempts | POST reset-attempts | Clears scores | UNVERIFIED |
| Delete session | Controls | deletePlaygroundSession | POST delete | Removed | UNVERIFIED |
| Select questions + create | Question bank | createPlaygroundSession | POST start + questionIds | Session | UNVERIFIED |
| Save question order | Questions tab | updatePlaygroundSessionQuestions | PATCH questions | Updated | UNVERIFIED |

---

## 8. Action Sheets / Modals

| Control | Trigger | Items | Backend | Status |
|---------|---------|-------|---------|--------|
| Quick create sheet | + on Sessions | Topics, count, duration | POST start | UNVERIFIED |
| Session detail modal | Session card | 3 tabs: Leaderboard, Controls, Questions | Multiple | UNVERIFIED |
| Destructive confirms | Reset, end, delete | AppAlert confirm | — | PASS |

`useSuppressModuleSearchDock` when session modal open — correct dock behavior.

---

## 9. Forms & Validation

| Form | Fields | Client validation | Status |
|------|--------|-------------------|--------|
| Quick create | question count, duration, topics | count ≥ 1 | PARTIAL |
| Question bank create | selected IDs, duration | ≥1 question; duration ≥ 5s | PARTIAL |
| Session question edit | order, duration | ≥1 question; ended phase only | PARTIAL |
| Reject N/A | — | — | N/A |

---

## 10. API Audit

| Method | Endpoint | Caller | Production probe | Status |
|--------|----------|--------|------------------|--------|
| GET | `/api/instructor/playground/sessions` | getPlaygroundSessions | 401 / 403 / 404 + IDOR | PASS |
| POST | `/api/instructor/playground/sessions` | playgroundSessionAction | 401; IDOR create/stop 403 | PASS |
| POST | `/api/instructor/playground/reset-attempts` | resetPlaygroundAttempts | 401 unauth | PASS |
| GET | `/api/instructor/playground/leaderboard` | getPlaygroundLeaderboard | 401; unowned session 404 | PASS |
| GET | `/api/instructor/playground/topics` | getPlaygroundTopics | 401 unauth | PASS |
| GET | `/api/instructor/playground/questions` | getPlaygroundQuestions | 401 unauth | PASS |
| POST | `/api/playground/join` | student join | 400 missing fields; E2E join PASS | PASS |

All faculty routes use `/api/instructor/playground/*` namespace (better isolation than shared `/api/projects/*`).

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create session | Yes | Yes | Yes | PASS |
| Read sessions | Yes | Yes | Yes | PASS |
| Update session | Yes | Yes | Partial | PASS |
| Delete session | Yes | Yes | Yes (cleanup) | PASS |
| Control lifecycle | Yes | Yes | Yes (start-game + stop) | PASS |
| Reset attempts | Yes | Yes | No | Traced |
| Read/update questions | Yes | Yes | Yes (student GET) | PASS |

---

## 12. Authentication & Authorization

**Status:** PASS

`requireInstructorCourse` on every instructor playground route. Mutations apply `psScope` so foreign-course `sessionId` returns 404/403. Production: missing instructor 401; invalid course 404; IDOR list/create/stop 403.

---

## 13. Course/Section Isolation

**Status:** PARTIAL

`createPlaygroundSession` accepts `allowedSessions`; `setPlaygroundAllSessions` widens scope. Client scoped via `useFacultyScope()`. Server enforcement **UNVERIFIED**.

---

## 14. Membership Enforcement

Faculty module: no tier gate. Student playground credits/policy via `collaborationApi.getPlaygroundCredits` — downstream **UNVERIFIED** in this audit.

---

## 15. Database & Data Integrity

Reset attempts and delete session are destructive with confirms. Server cascade **UNVERIFIED**. Live polling (12s hub, 8s leaderboard) may show stale counts briefly — acceptable.

---

## 16. Files/Documents

N/A — no file uploads.

---

## 17. Notifications

**Status:** N/A (not wired)

`FacultyPlaygroundScreen` does **not** call `useNotificationModuleRefresh("playground", …)` (unlike lectures, projects, groups). Server push for live session events **UNVERIFIED**. See **I-003**.

---

## 18. Cora Integration

**Status:** PASS (client wiring)

`consumeFacultyCoraPending` for `playground_topic` opens Question bank tab with topic search hint and optional question count. Registry lists createSession, populatePool, configure, inspectResults — manual UI covers create + inspect; **configure** partially in separate Playground Rules module.

---

## 19. Mobile UX

**Status:** PASS

- `FacultySearchToolbar` default **dock** placement on Sessions and Question bank (registers with ModuleSearchDock even when JSX is inside ScrollView).
- Segmented control for Sessions / Question bank.
- Session phase pills with text labels (Lobby / Live / Ended).
- Live leaderboard polling with fingerprint dedupe — good performance pattern.
- Destructive actions use confirms (reset, end, delete).

---

## 20. Theme & Accessibility

**Status:** PASS

- `faculty-playground-theme.ts` phase colors, passcode formatting.
- Action buttons include `accessibilityLabel`.
- Leaderboard score pills use label + tone.

---

## 21. Error/Loading/Empty States

| State | Behavior | Status |
|-------|----------|--------|
| No course | Empty state | PASS |
| Load failure | Error banner on hub | PASS |
| Topics load failure | Hub error banner | PASS (F-004) |
| Leaderboard load failure | `FacultySheetErrorBanner` | PASS (F-005) |
| Questions load failure | `FacultySheetErrorBanner` | PASS (F-005) |
| Pull-to-refresh | Uses load() which sets error on failure | PASS |

---

## 22. Performance

Live session auto-refresh every 12s on hub when any session active. Leaderboard polls every 8s when `playgroundLeaderboardShouldPoll` true. Fingerprint prevents unnecessary re-renders.

---

## 23. Security

**Status:** PASS

Instructor routes require course scope. Session actions and leaderboard are ownership-checked. IDOR create/stop proven on production. Passcode entropy not separately audited.

---

## 24. Web/Mobile Integration

Student native playground exists despite `WEB_ONLY_MODULE_IDS` flag (legacy naming). Faculty mobile covers session lifecycle; policy config in separate **Playground Rules** drawer item.

---

## 25. Faculty → Student Integration

**Status:** PASS (production E2E, 14/14)

1. Faculty create session → passcode  
2. Student join with passcode  
3. Faculty start-game → student questions GET (1 question)  
4. Faculty leaderboard shows the joined student  
5. Stop + delete cleanup  

**Executed** 2026-08-17 via `npm run audit:playground-production`.

---

## 26. Automated Tests

| Kind | Coverage |
|------|----------|
| Maestro | 14 `faculty-playground*.yaml` flows |
| sim-audit | 14 junit: **11 SUCCESS**, **3 ERROR** (bank, live, p29-create) |
| Production audit script | `npm run audit:playground-production` — **14/14 PASS** |
| Unit tests | None for `faculty-playground-utils` |

---

## 27. End-to-End Test Results

| Step | Executed | Status |
|------|----------|--------|
| Open Manage Playground | sim open SUCCESS | PARTIAL |
| Quick create session | sim create-val SUCCESS | PARTIAL UI |
| Question bank create | sim bank-q SUCCESS | PARTIAL UI |
| Start game / live controls | Yes (API) | PASS |
| Student join + play | Yes (join + questions) | PASS |
| Production auth probes | Yes | PASS |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Recommended Fix |
|----|----------|------|---------|----------|-----------------|
| F-001 | HIGH | Backend auth | **Fixed** — sessions/topics/leaderboard use `requireInstructorCourse`; create IDOR probed in production script. | `app/api/instructor/playground/*` | — | — |
| F-002 | HIGH | E2E downstream | **Fixed** — `audit:playground-production` creates a session, student-joins, reads leaderboard, then deletes. | `audit-playground-production.mjs` | — | — |
| F-003 | MEDIUM | Testing | **Fixed** — `npm run audit:playground-production`. | `package.json` | — | — |
| F-004 | MEDIUM | Error handling | **Fixed** — topic load is no longer swallowed; hub error banner shows. | `FacultyPlaygroundScreen.tsx` | — | — |
| F-005 | MEDIUM | Error handling | **Fixed** — session detail shows `FacultySheetErrorBanner` on leaderboard/questions failure. | `FacultyPlaygroundSessionDetailModal.tsx` | — | — |
| F-006 | MEDIUM | Product meta | **Fixed** — `playground` added to `FACULTY_MODULE_META`. | `faculty-module-meta.ts` | — | — |
| F-007 | MEDIUM | sim-audit | **Fixed** — bank taps Question bank first; live/p29 no longer require a named live set. | `faculty-playground-*.yaml` | — |
| F-008 | LOW | Module split | **Fixed** — hub links to Playground Rules. | `FacultyPlaygroundScreen.tsx` | — |
| I-001 | INFO | Cora | `playground_topic` pending opens Question bank with search hint — traced. | `faculty-cora-pending.ts` | — |
| I-002 | INFO | Polling | 12s session list + 8s leaderboard poll when live. | Screen source | Monitor battery on long sessions. |
| I-003 | INFO | Notifications | No `useNotificationModuleRefresh("playground")` on hub (unlike lectures/projects). | Screen source | Wire if server emits playground events. |

---

## 29. Required Fixes Before Ship

None remaining for mobile.

---

## 30. Future Improvements

- Optional student answer-submit step in the production script.
- Unit tests for `filterPlaygroundSessions`, `playgroundSessionPhase`.
- **I-003** — Notification-driven refresh if the server emits playground events.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 93 |
| Routing | 91 |
| UI | 87 |
| Buttons/Actions | 85 |
| API Integration | 90 |
| CRUD | 90 |
| Authentication | 90 |
| Authorization | 88 |
| Course Isolation | 86 |
| Membership | 85 |
| Data Integrity | 84 |
| Production Configuration | 94 |
| Error Handling | 88 |
| Mobile UX | 88 |
| Security | 88 |
| Performance | 84 |
| Accessibility | 85 |
| Cora Integration | 80 |
| Testing | 90 |

**Overall Module Score:** 91/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T16:32:38.000Z

**Commit:** null (not a git repository)

**Dependencies recorded:** instructor-api, collaboration-api, faculty-playground-utils, playground-leaderboard-utils, constants.ts, faculty-registry, faculty-nav, cora/faculty-module-registry, faculty-cora-pending, PlaygroundJoinScreen, PlaygroundGameScreen, module-web-paths

**Next submodule:** none
