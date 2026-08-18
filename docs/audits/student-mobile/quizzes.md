# Quizzes — Student Mobile Production Audit

```
MODULE: Quizzes
STUDENT ROUTE: /module/quizzes
NAVIGATION GROUP: Assessments. student-nav id quizzes, label Quizzes, icon clipboard-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS["quizzes"] → AssessmentModuleScreen type="quiz" title="Quizzes" → AssessmentListScreen
PRIMARY SCREEN: expo/src/components/assessments/AssessmentListScreen.tsx (type="quiz")
RELATED SCREENS: AssessmentItemCard, AssessmentFilterBar, AssessmentDetailScreen (/assessment/[id]), AssessmentQuizScreen (/assessment/take/[id]), AssessmentIssuesSheet, report route. Faculty: FacultyAssessmentsScreen assessmentType="quiz"
SUBROUTES: none under /module/quizzes (take/detail are shared assessment routes)
API ROUTES:
  GET  /api/student/quizzes?studentDatabaseId=&type=quiz
  POST /api/student/start-quiz
  GET  /api/quiz/take/:id
  GET  /api/student/quiz-attempt/:id
  GET  /api/student/attempt/:id/answers
  POST /api/student/save-answer
  POST /api/student/quiz-progress
  POST /api/quiz/submit
  POST /api/student/finalize-quiz
  POST /api/quiz/log-violation
  GET  /api/student/issues
  GET  /api/instructor/quizzes?assessment_type=quiz
  GET  /api/instructor/quizzes/:id
  POST /api/instructor/quizzes/create-from-bank
  PATCH /api/instructor/quizzes/:id/toggle-session
  DELETE /api/instructor/quizzes/:id
  GET  /api/instructor/issues?assessment_type=quiz
  GET  /api/instructor/deleted-items?type=quiz
SERVICES: student-api.ts getQuizzes (session-proof), assessment-quiz-api.ts, assessment-issues-api.ts, instructor-api.ts, assessment-list-logic.ts, assessment-detail-logic.ts
DATABASE MODELS: UNVERIFIED. Inferred: quizzes, quiz_questions, quiz_session_access, quiz_attempts. Backend handlers are not in this repository.
MEMBERSHIP: List unlocked. Start of a published quiz after semester end is server-closed (not a tier gate). Live Final 162 start is Explorer/Trailblazer retake gate.
CORA INTEGRATION: student-module-registry quizzes → read/explain/navigate/start; denied answer_active_protected_assessment, reveal_answer_keys. confirmationRequired: start.
FACULTY DEPENDENCY: Faculty Expo Manage Quizzes. Create + ECE2202 publish makes the row appear on the student type=quiz list.
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: /student/dashboard-v2/quizzes
```

Size: LARGE  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **quizzes**. Scope is Faculty Expo Manage Quizzes plus required backend and student Quizzes downstream.

Execution: production HTTPS with Alex ECE `910000001` / db `722`, Jordan `723`, ELEG `910100001` / db `734`, faculty `mchen` / instructor `15`, course `16`. Simulator: **UNVERIFIED**. Did not start or submit live Quiz 1/2/3 (`163`/`164`/`169`) or Final Exam 1 (`162`). Created disposable `AUDIT-DELETE` quizzes **207** and **209**, published ECE2202, then DELETE 200.

Prior faculty report `expo/docs/audits/faculty-mobile/quizzes.md` claimed READY 89 via `audit-quizzes-production.mjs`. That script treats header-only `x-instructor-id` as auth and HTTP 500 as PASS. Rejected. Faculty status set to `REVALIDATION_REQUIRED`.

---

## Executive Summary

Readiness: **READY WITH MINOR FIXES** (production session bind deployed 2026-08-18 `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf`; simulator / take-submit still UNVERIFIED)  
Score: **78/100**  
Blockers: 0  
Critical: 0  
High: 0  
Medium: 2  
Low: 3

Student Quizzes is the shared assessment list (`type="quiz"`) plus the shared take engine. Faculty Manage Quizzes is the same hub as finals/homework with `assessmentType="quiz"`.

**Local repairs (this repo only):** Rewrote `audit-quizzes-production.mjs` so header-only 200/201 and HTTP 500 fail (Q6). Typed `rollover_policy` on `getQuizzes` and show closed-term empty copy for quiz/homework only (Q7). Extended `ASSESSMENT_STUDENT_API_PATHS` with the quiz take client paths (Q9). Did not start or submit live quizzes 163/164/169 or exam 162.

**Auth that now holds on production:** unauth and header-only student quiz list, start-quiz, faculty list/detail/create/toggle/delete, and take-by-header are **401**. Alex cookie + Jordan `studentDatabaseId` is **403**. Faculty cookie + course `1` is **403**. Cookie-own faculty list is **200** (3 ECE quizzes). Cookie-own student list is **200**.

**Core faculty → student path works:** cookie create-from-bank quiz **207** (question `8911`) → draft hidden → PATCH `ECE2202` → Alex `type=quiz` list **n=1**, no answer-key fields on the student row → DELETE → list **n=0**.

**Production re-probe 2026-08-18** after `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf` on both aliases:

| Probe | Result |
|-------|--------|
| POST `/api/student/quiz-progress` header-only | **401** (was 200 on attempt 4463) |
| POST `/api/quiz/log-violation` header-only | **401** (was 200) |
| GET `/api/student/issues?studentId=722` header-only | **401** (was 200) |
| POST `/api/student/save-answer` header-only | **401** (was 404) |
| POST `/api/quiz/submit` header-only + fields | **401** (was 400) |

Semester close still blocks start of published quizzes. Simulator / take-submit is **UNVERIFIED**. Not READY TO SHIP.

Existing ECE Quiz 1–3 are `is_public: true`, `is_active: false`, `session_access: {}`, windows ended July 2026. Alex/Jordan/ELEG `type=quiz` lists are empty until faculty publishes. After a publish, the student row is `semester_assessments_closed: true`, `can_take: false`, `is_active: false`. Start and take return **403** semester-closed. That policy is consistent; the empty list UI still ignores `rollover_policy.show_closed_notice`.

Take/submit E2E is **UNVERIFIED** (semester closed). Simulator is **UNVERIFIED**. Not READY TO SHIP.

---

## Architecture

Student Drawer (`Assessments` → Quizzes)  
→ `/module/quizzes`  
→ `AssessmentListScreen` `type="quiz"`  
→ dock `StudentSearchToolbar` + filter  
→ `studentApi.getQuizzes(session, "quiz")` → `/api/student/quizzes?studentDatabaseId=&type=quiz`  
→ detail `/assessment/[id]` → take `/assessment/take/[id]` → `assessmentQuizApi` (already `studentAuthenticatedRequest`)  
→ Faculty Manage Quizzes `/module/quizzes` → `FacultyAssessmentsScreen assessmentType="quiz"` → `instructorRequest` (cookies + MFA + refresh, fail closed)

---

## Files Inspected

- `expo/src/constants/student-nav.ts`, `faculty-nav.ts`
- `expo/src/modules/registry.tsx`, `faculty-registry.tsx`
- `expo/src/components/assessments/AssessmentListScreen.tsx`, `AssessmentFilterBar.tsx`, `assessment-list-logic.ts`, `assessment-detail-logic.ts`, `assessment-config.ts`
- `expo/src/lib/student-api.ts` (`getQuizzes`, `QuizItem`)
- `expo/src/lib/assessment-quiz/assessment-quiz-api.ts`, `assessment-quiz-auth.contract.test.ts`
- `expo/src/lib/assessment-issues-api.ts`
- `expo/src/lib/instructor-api.ts` (`getQuizzes`, `createQuizFromBank`, `toggleQuizSession`)
- `expo/src/lib/student-session-proof.ts` (`ASSESSMENT_STUDENT_API_PATHS`)
- `expo/src/lib/cora/student-module-registry.ts` (`quizzes`)
- `expo/scripts/audit-quizzes-production.mjs`
- `expo/docs/audits/faculty-mobile/quizzes.md`

---

## Navigation & Routing

Student nav `quizzes` → `/module/quizzes` → registry `AssessmentModuleScreen type="quiz"`. Faculty nav `quizzes` → same path, faculty registry `assessmentModule("quiz")`, segments `?segment=issues` / `?segment=deleted`. Search uses `StudentSearchToolbar` default `placement="dock"`. PASS.

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app`  
Development URLs: not used for probes  
Mock dependencies: none on list/take clients  
`API_BASE_URL` + `assertProductionHttpsUrl` + fail-closed session proof on student and faculty clients.

---

## Screens

| Screen | Status | Notes |
|--------|--------|-------|
| AssessmentListScreen quiz | ACTIVE | Empty for unpublished ECE quizzes; ignores `rollover_policy` |
| AssessmentDetailScreen | ACTIVE | `buildAssessmentDetailActions` honors `can_take` + `semester_assessments_closed` |
| AssessmentQuizScreen | ACTIVE | Client session-proofed; live take blocked by semester close |
| FacultyAssessmentsScreen quiz | ACTIVE | Lists 163/164/169 as Closed |
| Faculty create/editor/preview | ACTIVE | Cookie create-from-bank 200 |
| Faculty issues / deleted | PROBED | Cookie GET 200 |

---

## Components

| Component | Class |
|-----------|-------|
| AssessmentFilterBar / StudentSearchToolbar dock | ACTIVE |
| AssessmentItemCard | ACTIVE |
| FacultyEmptyState on empty list | ACTIVE — copy is “No quizzes yet” even when term is closed |
| AssessmentIssuesSheet | ACTIVE; list API header-only 200 |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Refresh | empty list | `onRefresh` → `getQuizzes` | GET student quizzes | 200 own cookie | 200 n=0 | PASS |
| Start | detail | `assessmentQuizApi.startQuiz` | POST start-quiz | 401 header-only; 403 semester-closed when published after term | 401 / 403 | PASS (policy) |
| Faculty publish | session toggle | `toggleQuizSession` | PATCH toggle-session | cookie 200; header-only 401 | 200 / 401 | PASS |
| Faculty delete | card | `deleteQuiz` | DELETE quizzes/:id | cookie 200; header-only 401 | 200 / 401 | PASS |

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/student/quizzes?type=quiz` no id | — | 400 Student ID required | — | — | — | PASS |
| GET | same + `studentDatabaseId=722` | — | **401** | — | — | — | PASS |
| GET | same + `x-student-id` only | — | **401** | — | — | — | PASS |
| GET | same + Alex cookie | `getQuizzes` | 200 n=0 (none published) | — | — | ECE | PASS |
| GET | Alex cookie + `studentDatabaseId=723` | — | **403** Access denied | isolation | — | — | PASS |
| POST | `/api/student/start-quiz` header-only | — | **401** | — | — | — | PASS |
| POST | start 169 cookie | — | **403** semesterAssessmentsClosed | — | — | — | PASS |
| POST | start 162 cookie | — | **403** retake membership | — | Explorer+ | — | PASS |
| POST | start 207 after publish | — | **403** semester closed | — | — | — | PASS |
| GET | `/api/quiz/take/169` header-only | — | **401** | — | — | — | PASS |
| GET | take 169 cookie | — | **404** not available for session | — | — | — | PASS |
| GET | take 207 after publish | — | **403** | — | — | — | PASS |
| POST | `/api/student/quiz-progress` header-only | take client (session-proof) | **200 ok** | **FAIL** | — | — | FAIL Q1 |
| POST | `/api/quiz/log-violation` header-only | take client | **200** | **FAIL** | — | — | FAIL Q2 |
| GET | `/api/student/issues?studentId=722` header-only | issues client (session-proof) | **200** | **FAIL** | — | — | FAIL Q3 |
| POST | `/api/student/save-answer` header-only | take client | **404** (not 401) | **FAIL** | — | — | FAIL Q4 |
| POST | `/api/quiz/submit` header-only | take client | **400** (not 401) | **FAIL** | — | — | FAIL Q5 |
| POST | `/api/student/finalize-quiz` header-only | take client | **401** | — | — | — | PASS |
| GET | `/api/student/attempt/4463/answers` header-only | take client | **401** | — | — | — | PASS |
| GET | same + Alex cookie | — | 200 | owner | — | — | PASS |
| GET | same + Jordan cookie | — | **403** | isolation | — | — | PASS |
| GET | `/api/instructor/quizzes?assessment_type=quiz` none | — | **401** | — | — | — | PASS |
| GET | same header-only | — | **401** | — | — | — | PASS |
| GET | cookie + headers course 16 | `instructorApi.getQuizzes` | 200 n=3 | — | — | ECE | PASS |
| GET | cookie-only no course | — | 400 missing x-course-id | — | — | — | PASS |
| GET | cookie + course 1 | — | **403** | — | — | IDOR | PASS |
| GET | student cookie → faculty list/169 | — | **401** Instructor authentication required | role | — | — | PASS |
| POST/PATCH/DELETE | faculty create/toggle/delete header-only | — | **401** | — | — | — | PASS |
| POST | create-from-bank cookie | faculty | 200 quiz 207/209 | — | — | ECE | PASS |
| PATCH | toggle ECE2202 cookie | faculty | 200 | — | — | section | PASS |
| DELETE | 207/209 cookie | faculty | 200 trash | — | — | — | PASS |

---

## CRUD

Faculty create → publish → student visible → delete **executed** on production with cookies. Draft hidden. Student row had no `correct_answer` / solution keys. Faculty detail 169 and 207 include `correct_answer` and bank solution fields (expected for authenticated instructor).

Student create/update/delete of quizzes: not offered. PASS.

---

## Authentication

Header-only identity is rejected on list, start, take, finalize, answers, and faculty mutations. It is **not** rejected on progress, log-violation, issues, save-answer, or submit.

Mobile clients already send cookies + MFA + `x-cc-refresh` and throw 401 if proof is missing (`studentRequest` / `instructorRequest`). Clients are not the remaining hole.

---

## Student Authorization / Isolation / Course

Alex cannot list Jordan’s quizzes (**403**). Jordan cannot read Alex attempt **4463** answers (**403**). Faculty course **1** list **403**. Student cookie cannot call instructor quiz APIs (**401**). Faculty cookie cannot call student quiz list (**401**). PASS.

---

## Membership Enforcement

Scholar start of live Final **162** → 403 retake upgrade. Quiz start after term end is semester-close, not a tier gate. List has no minTier. Take-with-superpowers: UNVERIFIED (no live take).

---

## Assessment Security

Student list row for published 207/209: no answer-key keys. Take 207: 403 (no question payload). Faculty GET 169: 15 questions with `correct_answer`. Header-only faculty GET 169: 401. Did not fetch student take of a live open quiz (none exist). Keys on an in-progress take: **UNVERIFIED**.

---

## Cora Security

Registry denies answer-key reveal and answering a protected live quiz; start requires confirmation. Tool execution on production: **UNVERIFIED** (code-traced only).

---

## Mobile UX / Empty / Theme

Grouped list + dock search matches native module rules. Empty copy is “No quizzes yet” / “Check back when your instructor publishes new assessments.” Production also returns `rollover_policy.show_closed_notice: true`, `academic_term_label: "Summer 2026"`, `semester_end_iso: 2026-07-31`. `getQuizzes` types only `{ quizzes }` and `fetchAssessmentsForKind` drops the policy. Quiz/homework empty states should surface the closed term; finals/mid follow instructor schedule and must not reuse that notice.

Published-but-closed row flags (209): `semester_assessments_closed: true`, `can_take: false`, `is_active: false`, `session_access_active: true`. `statusMeta` would label **Closed** (is_active is false). `canShowStartAssessment` hides Start. Detail logic PASS for this shape.

---

## Faculty → Student Integration

Unpublished Quiz 1–3 never appear on the student list (empty `session_access`). Publishing ECE2202 on a new quiz makes the row appear immediately. Start remains semester-closed. Faculty issues/deleted cookie GET 200. Leftover History row for AUDIT-E2E Final **201** is a prior finals probe (faculty GET 201 → 404).

---

## Tests

- `assessment-quiz-auth.contract.test.ts` — client uses session-proof; `ASSESSMENT_STUDENT_API_PATHS` lists `/api/final/take/` but not `/api/quiz/take/`, `/api/quiz/submit`, `/api/quiz/log-violation`, `/api/student/attempt/`, `/api/student/quizzes`.
- `audit-quizzes-production.mjs` — **dishonest**: header-only treated as auth; `createFromBankBlocked` 500 is PASS; student list/attempt probes use headers only.

---

## End-to-End Results

| Flow | Result |
|------|--------|
| Faculty login → list quiz | 200, 169/164/163 Closed |
| Create from bank → publish ECE2202 → student list | PASS (207, 209) |
| Student start published quiz | 403 semester closed |
| Student take / save / submit / finalize | UNVERIFIED |
| Simulator press-through | UNVERIFIED |
| Cleanup DELETE 207/209 | 200 |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Query-only student list | 401 |
| Header-only student list / start / take / faculty CRUD | 401 |
| Header-only quiz-progress / log-violation / issues | **200** |
| Header-only save-answer / submit | reached handler (404/400) |
| Cookie + other student id | 403 |
| Faculty cookie + foreign course | 403 |
| Student cookie → faculty quiz APIs | 401 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| Q1 | CRITICAL | Auth | **Fixed on production** `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf`. Header-only quiz-progress 401. | re-probe both aliases → 401 | Server `/api/student/quiz-progress` | Confirmed |
| Q2 | CRITICAL | Auth | **Fixed on production.** Header-only log-violation 401. | re-probe 401 | Server `/api/quiz/log-violation` | Confirmed |
| Q3 | CRITICAL | Auth | **Fixed on production.** Header-only issues 401. | re-probe 401 | Server `/api/student/issues` | Confirmed |
| Q4 | HIGH | Auth | **Fixed on production.** Header-only save-answer 401. | re-probe 401 | Server `/api/student/save-answer` | Confirmed |
| Q5 | HIGH | Auth | **Fixed on production.** Header-only quiz/submit 401. | re-probe 401 | Server `/api/quiz/submit` | Confirmed |
| Q6 | HIGH | Tests | **Fixed locally.** Script treated header-only as auth and HTTP 500 as PASS. | prior script L37–54, L97–99, L147–149, L213 | `expo/scripts/audit-quizzes-production.mjs` | Local honesty + production re-probe PASS. |
| Q7 | MEDIUM | UX | **Fixed locally.** Empty quiz/homework list ignored `rollover_policy.show_closed_notice`. | list 200 + policy `show_closed_notice:true`; prior `getQuizzes` typed `{quizzes}` only | `student-api.ts`, `assessment-list-logic.ts`, `AssessmentListScreen.tsx` | Local: `QuizListRolloverPolicy` + `assessmentListEmptyCopy` for quiz/homework only. Finals/mid keep “No … yet”. Does not patch the server. |
| Q8 | MEDIUM | E2E | Simulator / live take-submit unverified | semester closed; no Maestro | — | Re-run when a quiz is open or term policy allows |
| Q9 | LOW | Tests | **Fixed locally.** `ASSESSMENT_STUDENT_API_PATHS` omitted quiz take/submit/log/attempt/list. | prior constant had `/api/final/take/` only | `student-session-proof.ts`, contract test | Local: added `/api/quiz/take/`, `/api/quiz/submit`, `/api/quiz/log-violation`, `/api/student/attempt/`, `/api/student/save-and-finish-later`, `/api/student/quizzes`. Does not close Q1–Q5. |
| Q10 | LOW | Data | History still lists leftover AUDIT-E2E Final 201 | quiz-history n=4 includes 201; faculty GET 201 → 404 | production data | Faculty/admin trash purge; do not invent a mobile delete |
| Q11 | LOW | Docs | Prior faculty READY 89 is invalid | script treats headers as auth | `expo/docs/audits/faculty-mobile/quizzes.md` | REVALIDATION_REQUIRED until honest script + server Q1–Q5 |

---

## Required Before Ship

1. Production session bind on quiz-progress, log-violation, issues, save-answer, and quiz/submit (401 for header-only).
2. Re-probe those five routes independently. Do not mark Q1–Q5 fixed from this mobile repo.
3. Honest `audit:quizzes-production` (local Q6).
4. Simulator take on a **non-live** open quiz when semester policy allows (Q8).
5. Do not start/submit Quiz 3 or Final 1.

---

## Future Improvements

- Show closed-term empty copy from `rollover_policy` on quiz/homework (Q7).
- Add quiz paths to `ASSESSMENT_STUDENT_API_PATHS` (Q9).
- Purge leftover audit quiz 201 from history (Q10).

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 95 |
| Routing | 95 |
| UI | 78 |
| Buttons | 80 |
| API | 80 |
| CRUD | 88 |
| Authentication | 88 |
| Authorization | 85 |
| Student Isolation | 90 |
| Course Isolation | 90 |
| Membership | 80 |
| Production Configuration | 90 |
| Data Integrity | 70 |
| Security | 82 |
| Assessment Security | 85 |
| Cora Security | 70 |
| Error Handling | 75 |
| Mobile UX | 68 |
| Performance | 80 |
| Accessibility | 75 |
| Testing | 35 |

OVERALL SCORE: **78/100**

FINAL STATUS: **READY WITH MINOR FIXES**

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json` key `quizzes` and `docs/audits/student-mobile/quizzes/manifest.json`.
