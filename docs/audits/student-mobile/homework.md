# Homework — Student Mobile Production Audit

```
MODULE: Homework
STUDENT ROUTE: /module/homework
NAVIGATION GROUP: Assessments. student-nav id homework, label Homework, icon book-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS["homework"] → AssessmentModuleScreen type="homework" title="Homework" → AssessmentListScreen
PRIMARY SCREEN: expo/src/components/assessments/AssessmentListScreen.tsx (type="homework")
RELATED SCREENS: AssessmentItemCard, AssessmentFilterBar, AssessmentDetailScreen, AssessmentQuizScreen (apiType homework → /api/homework/take|submit), AssessmentIssuesSheet. Faculty: FacultyAssessmentsScreen assessmentType="homework"
SUBROUTES: none under /module/homework (take/detail are shared assessment routes)
API ROUTES:
  GET  /api/student/quizzes?studentDatabaseId=&type=homework
  GET  /api/student/homework-history?studentId=&session=   ← dashboard stats, not the Homework list
  POST /api/student/start-quiz
  GET  /api/homework/take/:id
  POST /api/homework/submit
  GET  /api/student/quiz-attempt/:id
  GET  /api/student/attempt/:id/answers
  POST /api/student/save-answer
  POST /api/student/quiz-progress
  POST /api/student/finalize-quiz
  POST /api/quiz/log-violation
  GET  /api/student/issues
  GET  /api/instructor/quizzes?assessment_type=homework
  GET  /api/instructor/quizzes/:id
  POST /api/instructor/quizzes/create-from-bank (assessment_type: homework)
  PATCH /api/instructor/quizzes/:id/toggle-session
  DELETE /api/instructor/quizzes/:id
  GET  /api/instructor/issues?assessment_type=homework
  GET  /api/instructor/deleted-items?type=homework
SERVICES: student-api.ts getQuizzes, assessment-quiz-api.ts, assessment-issues-api.ts, instructor-api.ts, assessment-list-logic.ts, assessment-list-empty-copy.ts
DATABASE MODELS: UNVERIFIED. Inferred: quizzes (assessment_type=homework), quiz_session_access, quiz_attempts. Backend handlers are not in this repository.
MEMBERSHIP: List unlocked. Start after semester end is server-closed (not a tier gate).
CORA INTEGRATION: student-module-registry homework → read/explain/navigate/start; denied answer_active_protected_assessment, reveal_answer_keys. confirmationRequired: start.
FACULTY DEPENDENCY: Faculty Expo Manage Homework. Create + ECE2202 publish makes the row appear on the student type=homework list.
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: /student/dashboard-v2/homework
```

Size: LARGE  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Homework**. Scope is Faculty Expo Manage Homework plus required backend and student Homework downstream.

Execution: production HTTPS with Alex ECE `910000001` / db `722`, Jordan `723`, faculty `mchen` / instructor `15`, course `16`. Simulator: **UNVERIFIED**. Did not start or submit live Homework 1–8 (`159`–`172`) or Final Exam 1 (`162`). Created disposable `AUDIT-DELETE Homework` **211**, published ECE2202, then DELETE 200.

Prior faculty report `expo/docs/audits/faculty-mobile/homework.md` claimed READY 89 via `audit-homework-production.mjs`. That script treats header-only `x-instructor-id` as auth, HTTP 500 as PASS, and unauth submit **400** as PASS. Rejected. Faculty status set to `REVALIDATION_REQUIRED`.

Empty-list closed-term copy for homework was already wired in the Quizzes local repair (`assessmentListEmptyCopy`). Not re-counted as a new Homework fix.

---

## Executive Summary

Readiness: **READY WITH MINOR FIXES** (production session bind deployed 2026-08-18 `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf`; simulator / take-submit still UNVERIFIED)  
Score: **78/100**  
Blockers: 0  
Critical: 0  
High: 0  
Medium: 2  
Low: 3

Student Homework is the shared assessment list (`type="homework"`) plus the shared take engine with `/api/homework/take` and `/api/homework/submit`. Faculty Manage Homework is the same hub with `assessmentType="homework"`.

**Local repairs (this repo only):** Rewrote `audit-homework-production.mjs` so header-only 200/201 and HTTP 500 fail (HW5). Extended `ASSESSMENT_STUDENT_API_PATHS` with `/api/homework/take/` and `/api/homework/submit` (HW8). Did not start or submit live Homework 1–8 (`159`–`172`) or Final Exam 1 (`162`). Did not rewrite empty-list copy or point the Homework list at `/api/student/homework-history`.

**Auth that holds on production:** header-only student homework list, homework-history, start-quiz, `/api/homework/take/172`, `/api/homework/submit` (with fields), finalize, and faculty list/create/toggle/delete are **401**. Alex cookie + Jordan id is **403**. Jordan take 172 and attempt 4463 answers are **403**. Faculty cookie + course `1` is **403**. Cookie-own faculty list is **200** (8 ECE homework). Cookie-own student list is **200**.

**Homework submit and quiz submit both require a session after deploy.** Header-only `/api/homework/submit` and `/api/quiz/submit` with fields → **401**. Empty unauth homework body still → **400** (validation before auth, HW11).

**Core faculty → student path works:** cookie create-from-bank homework **211** (question `9422`) → draft hidden → PATCH `ECE2202` → Alex `type=homework` **n=1**, no answer-key fields → DELETE → **n=0**.

**Production re-probe 2026-08-18** after `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf` on both aliases:

| Probe | Result |
|-------|--------|
| POST `/api/student/quiz-progress` header-only | **401** (was 200) |
| POST `/api/quiz/log-violation` header-only | **401** (was 200) |
| GET `/api/student/issues?studentId=722` header-only | **401** (was 200) |
| POST `/api/student/save-answer` header-only | **401** (was 404) |
| POST `/api/homework/submit` header-only + fields | **401** |

Existing ECE Homework 1–8 are `is_public: true`, `is_active: false`, `session_access: {}`, windows ended June–July 2026. Student list is empty until faculty publishes. After publish, row is `semester_assessments_closed: true`, `can_take: false`, `is_active: false`. Start and `/api/homework/take` return **403** semester-closed.

`/api/student/homework-history` cookie **200 n=0** while `/api/student/quiz-history` lists Homework 7 (4463, 4474) and Homework 4 (4485). The Homework screen does not call homework-history; dashboard does.

Take/submit E2E is **UNVERIFIED**. Simulator is **UNVERIFIED**. Not READY TO SHIP.

---

## Architecture

Student Drawer (`Assessments` → Homework)  
→ `/module/homework`  
→ `AssessmentListScreen` `type="homework"`  
→ dock search + `getQuizzes(session, "homework")`  
→ detail `/assessment/[id]` → take `/assessment/take/[id]` → `assessmentQuizApi.take(..., "homework")` → `/api/homework/take/:id`  
→ Faculty Manage Homework `/module/homework` → `FacultyAssessmentsScreen assessmentType="homework"` → `instructorRequest`

---

## Files Inspected

- `expo/src/constants/student-nav.ts`, `faculty-nav.ts`
- `expo/src/modules/registry.tsx`, `faculty-registry.tsx`
- `expo/src/components/assessments/AssessmentListScreen.tsx`, `assessment-list-logic.ts`, `assessment-list-empty-copy.ts`, `AssessmentQuizScreen.tsx`
- `expo/src/lib/student-api.ts` (`getQuizzes`)
- `expo/src/lib/assessment-quiz/assessment-quiz-api.ts`, `normalize-assessment-type.ts`
- `expo/src/lib/student-session-proof.ts`
- `expo/src/lib/student-dashboard-stats.ts` (homework-history)
- `expo/src/lib/cora/student-module-registry.ts`
- `expo/scripts/audit-homework-production.mjs`
- `expo/docs/audits/faculty-mobile/homework.md`

---

## Navigation & Routing

Student `homework` → `/module/homework`. Faculty `homework` → same path, segments `?segment=issues` / `?segment=deleted`. `StudentSearchToolbar` default `placement="dock"`. PASS.

---

## Production Configuration

Production API: `https://coursecollab.vercel.app`. No mocks on list/take. Clients fail closed without cookies.

---

## Screens

| Screen | Status | Notes |
|--------|--------|-------|
| AssessmentListScreen homework | ACTIVE | Empty until publish; closed-term copy already from Quizzes Q7 |
| AssessmentDetailScreen | ACTIVE | 211 flags hide Start |
| AssessmentQuizScreen | ACTIVE | `/api/homework/take`; live take blocked |
| FacultyAssessmentsScreen homework | ACTIVE | 8 Closed rows |
| Faculty issues / deleted | PROBED | Cookie GET 200 n=0 |

---

## API Routes

| Method | Route | Auth result | Status |
|--------|-------|-------------|--------|
| GET | student quizzes `type=homework` no id | 400 | PASS |
| GET | same + dbId, no cookie | **401** | PASS |
| GET | same + header-only | **401** | PASS |
| GET | Alex cookie | 200 n=0 + `show_closed_notice` | PASS |
| GET | Alex cookie + Jordan dbId | **403** | PASS |
| GET | homework-history header-only / unauth | **401** | PASS |
| GET | homework-history Alex cookie | 200 **n=0** (quiz-history has HW4/HW7) | HW7 |
| POST | start-quiz header-only | **401** | PASS |
| POST | start 172 cookie | **403** semester closed | PASS |
| GET | `/api/homework/take/172` header-only / unauth | **401** | PASS |
| GET | take 172 Alex cookie | **403** semester closed | PASS |
| GET | take 172 Jordan cookie | **403** Access denied | PASS |
| POST | `/api/homework/submit` header-only + fields | **401** | PASS |
| POST | `/api/homework/submit` unauth + fields | **401** | PASS |
| POST | `/api/homework/submit` unauth empty | **400** validation first | LOW HW11 |
| POST | quiz-progress header-only | **200** | FAIL HW1 |
| POST | log-violation header-only | **200** | FAIL HW2 |
| GET | student issues header-only | **200** | FAIL HW3 |
| POST | save-answer header-only | **404** | FAIL HW4 |
| POST | finalize header-only | **401** | PASS |
| GET | attempt 4463 answers Alex | 200 n=0 | PASS |
| GET | attempt 4463 answers Jordan | **403** | PASS |
| GET | faculty homework list none / header-only | **401** | PASS |
| GET | faculty cookie + course 16 | 200 n=8 | PASS |
| GET | faculty cookie + course 1 | **403** | PASS |
| GET | faculty cookie-only | 400 missing course | PASS |
| GET | student cookie → faculty list | **401** | PASS |
| POST/PATCH/DELETE | faculty create/toggle/delete header-only | **401** | PASS |
| POST | create-from-bank cookie `assessment_type=homework` | 200 id **211** | PASS |
| PATCH | toggle ECE2202 | 200 | PASS |
| DELETE | 211 | 200 | PASS |

---

## CRUD

Faculty create → publish → student visible → delete **executed** (homework 211). Draft hidden. Student row had no key fields. Faculty GET 172 includes `correct_answer` (expected for instructor). Student cannot CRUD homework. PASS.

---

## Authentication / Isolation / Membership

Header-only identity is rejected on homework list, history, take, submit, start, finalize, and faculty mutations. It is **not** rejected on progress, log-violation, issues, or save-answer.

Alex cannot list Jordan’s homework. Jordan cannot take Alex’s 172 or read 4463 answers. Faculty course 1 blocked. Student cookie cannot call instructor APIs. List has no minTier. Live take membership: UNVERIFIED (semester closed).

---

## Assessment Security

Student row 211: no key fields. Take 211/172: 403, no question payload. Faculty 172: 15 questions with `correct_answer`. In-progress take keys: **UNVERIFIED**.

---

## Cora Security

Registry denies key reveal and answering a protected live homework. Tool execution: **UNVERIFIED**.

---

## Mobile UX / Empty

Dock search + grouped list. `rollover_policy.show_closed_notice: true` / Summer 2026. `assessmentListEmptyCopy("homework", …)` already returns “Homework is closed”. 211 flags: Closed, no Start. PASS (prior Quizzes repair).

---

## Faculty → Student Integration

Unpublished HW 1–8 never appear on the student list. Publishing ECE2202 on new homework 211 made the row appear. Start remains semester-closed. Faculty issues/deleted cookie 200 empty.

Dashboard `/api/student/homework-history` is empty; quiz-history still has HW4/HW7. Homework module list does not use homework-history.

---

## Tests

- `assessment-list-logic.test.ts` already covers homework closed-term copy.
- `assessment-quiz-auth.contract.test.ts` still asserts `/api/${apiType}/take|submit` and now requires `ASSESSMENT_STUDENT_API_PATHS` to include `/api/homework/take/` and `/api/homework/submit` (HW8). Those two paths are excluded from the source-scan list the same way quiz take/submit are.
- `audit-homework-production.mjs` now matches quizzes honesty: header-only is not auth; 200/201 and HTTP 500 fail; expected reject is 401; no cookie E2E that starts live homework (HW5).

---

## End-to-End Results

| Flow | Result |
|------|--------|
| Faculty list homework | 200, 8 Closed |
| Create homework → publish → student list | PASS (211) |
| Student start / homework take | 403 semester closed |
| Student save / submit / finalize | UNVERIFIED |
| Simulator | UNVERIFIED |
| DELETE 211 | 200 |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Query-only / header-only homework list | 401 |
| Header-only homework take / submit / start / faculty CRUD | 401 |
| Header-only quiz-progress / log-violation / issues | **401** |
| Header-only save-answer | **401** |
| Cookie + other student | 403 |
| Faculty + foreign course | 403 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| HW1 | CRITICAL | Auth | **Fixed on production** `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf`. Header-only quiz-progress 401. | re-probe both aliases → 401 | Server `/api/student/quiz-progress` | Confirmed |
| HW2 | CRITICAL | Auth | **Fixed on production.** Header-only log-violation 401. | re-probe 401 | Server `/api/quiz/log-violation` | Confirmed |
| HW3 | CRITICAL | Auth | **Fixed on production.** Header-only issues 401. | re-probe 401 | Server `/api/student/issues` | Confirmed |
| HW4 | HIGH | Auth | **Fixed on production.** Header-only save-answer 401. | re-probe 401 | Server `/api/student/save-answer` | Confirmed |
| HW5 | HIGH | Tests | **Fixed locally.** Script treated header-only as auth and HTTP 500 as PASS. | prior script used headers as auth | `expo/scripts/audit-homework-production.mjs` | Local honesty + production re-probe PASS. |
| HW6 | MEDIUM | E2E | Simulator / live take-submit unverified | semester closed; no Maestro | — | Re-run when a homework is open |
| HW7 | MEDIUM | Data | homework-history empty while quiz-history has HW4/HW7 | cookie homework-history n=0 / stats total 0; quiz-history 172 and 168 | Server homework-history (not in this repo). Dashboard caller: `student-dashboard-stats.ts` | Server populate or align with quiz-history. Do not point Homework list at history. |
| HW8 | LOW | Tests | **Fixed locally.** `ASSESSMENT_STUDENT_API_PATHS` omitted `/api/homework/take/` and `/api/homework/submit`. | prior constant had quiz/final take only | `student-session-proof.ts`, contract test | Local: added homework take/submit paths. Source still uses `${apiType}`. Does not close HW1–HW4. |
| HW9 | LOW | Data | History leftover AUDIT-E2E Final 201 | quiz-history | production data | Admin purge |
| HW10 | LOW | Docs | Prior faculty READY 89 invalid | dishonest script | `expo/docs/audits/faculty-mobile/homework.md` | REVALIDATION_REQUIRED |
| HW11 | LOW | Auth | Unauth empty homework submit is 400 before 401 | empty POST → 400 Missing required fields; same payload with fields → 401 | Server `/api/homework/submit` | Check auth before validation |

---

## Required Before Ship

1. Production session bind on quiz-progress, log-violation, issues, and save-answer (401 for header-only).
2. Re-probe those four routes independently. Do not mark HW1–HW4 fixed from this mobile repo.
3. Honest `audit:homework-production` (local HW5 done; re-run after server patch).
4. Simulator take on a **non-live** open homework when semester policy allows (HW6).
5. Do not start/submit live Homework 7 (`172`) or Final 1 (`162`).

---

## Future Improvements

- Align homework-history with quiz-history (HW7) — server, not Homework list.
- Purge leftover audit quiz 201 (HW9).

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 95 |
| Routing | 95 |
| UI | 82 |
| Buttons | 80 |
| API | 80 |
| CRUD | 88 |
| Authentication | 88 |
| Authorization | 88 |
| Student Isolation | 92 |
| Course Isolation | 90 |
| Membership | 80 |
| Production Configuration | 90 |
| Data Integrity | 62 |
| Security | 82 |
| Assessment Security | 85 |
| Cora Security | 70 |
| Error Handling | 75 |
| Mobile UX | 78 |
| Performance | 80 |
| Accessibility | 75 |
| Testing | 46 |

OVERALL SCORE: **78/100**

FINAL STATUS: **READY WITH MINOR FIXES**
