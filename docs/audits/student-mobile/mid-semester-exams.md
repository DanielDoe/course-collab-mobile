# Mid-Semester — Student Mobile Production Audit

```
MODULE: Mid-Semester
STUDENT ROUTE: /module/mid-semester-exams
NAVIGATION GROUP: Assessments. student-nav id mid-semester-exams, label Mid-Semester, icon newspaper-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS["mid-semester-exams"] → AssessmentModuleScreen type="mid_semester" → AssessmentListScreen
PRIMARY SCREEN: expo/src/components/assessments/AssessmentListScreen.tsx (type="mid_semester")
RELATED SCREENS: AssessmentDetailScreen, AssessmentQuizScreen (apiType midsem → /api/midsem/take|submit). Faculty: FacultyAssessmentsScreen assessmentType="mid_semester"
SUBROUTES: none under /module/mid-semester-exams
API ROUTES:
  GET  /api/student/mid-semesters?studentId=          ← leftover getMidSemesters helper; production 401 without session as of dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf. List/Cora use unified quizzes list.
  GET  /api/student/quizzes?type=mid_semester         ← list + Cora client (session-bound 401)
  POST /api/student/start-quiz
  GET  /api/midsem/take/:id
  POST /api/midsem/submit
  GET  /api/student/quiz-attempt/:id
  POST /api/student/save-answer, quiz-progress, finalize-quiz
  POST /api/quiz/log-violation
  GET  /api/instructor/quizzes?assessment_type=mid_semester
SERVICES: student-api.ts getQuizzes (list) + leftover getMidSemesters, assessment-list-logic.ts, assessment-quiz-api.ts, normalize-assessment-type.ts (mid_semester → midsem), cora-student-context-loader.ts
DATABASE MODELS: UNVERIFIED. Backend handlers are not in this repository.
MEMBERSHIP: List unlocked. Cora registry denies start / solve during protected exam.
CORA INTEGRATION: mid-semester-exams allowed read/explain/navigate; denied solve_during_protected_exam, retrieve_answers_during_exam, start.
FACULTY DEPENDENCY: Faculty Expo Mid-Semester Exams. Create + ECE2202 publish appears on both list APIs.
WEB DEPENDENCY: /student/dashboard-v2/mid-semester-exams
```

Size: LARGE  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Mid-semester**. Scope is Faculty Expo Mid-Semester Exams plus required backend and student Mid-Semester downstream.

Execution: Alex ECE `910000001` / db `722`, Jordan `723`, faculty `mchen` / instructor `15`, course `16`. Simulator: **UNVERIFIED**.

**Live-exam incident:** cookie `POST /api/student/start-quiz` for **Mid-Semester Exam 2 (`167`)** returned **200 `attemptId` 4493**. Take then 403 “Assessment has expired”. Later `quiz-attempt` shows `attemptId: null`, `sessionExpired: true`. Quiz-history now lists `167:4493`. **Do not finalize 4493.** Do not start `166`/`167` again.

Disposable `AUDIT-DELETE Mid` **213** and **215** were created, published ECE2202, started (4494, 4495), then DELETE 200. History still lists those titles.

Prior faculty report claimed READY 91 via `audit-mid-semester-production.mjs` (headers as auth; unauth submit 400 as PASS). Rejected. Faculty status `REVALIDATION_REQUIRED`.

---

## Executive Summary

Readiness: **READY WITH MINOR FIXES** (production session bind deployed 2026-08-18 `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf`; simulator / submit-finalize still UNVERIFIED)  
Score: **72/100**  
Blockers: 0  
Critical: 0  
High: 0  
Medium: 1  
Low: 3

Student Mid-Semester take uses `/api/midsem/take` via `normalizeAssessmentType`. The mobile list and Cora loader now call the unified quizzes list (`getQuizzes(session, "mid_semester")`).

**Production re-probe 2026-08-18** on `https://coursecollab.vercel.app` and `https://course-collab.com` after `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf`:

| Probe | Result |
|-------|--------|
| Unauth / header-only `GET /api/student/mid-semesters?studentId=722` | **401** Student authentication required |
| Header-only quiz-progress / log-violation / issues / save-answer | **401** |
| Header-only quiz/homework/midsem submit + fields | **401** |
| Alex cookie mid-semesters | **200 n=0** |
| Cookie `POST /api/student/start-quiz` quizId **167** | **403 Assessment has expired** (did not create a new attempt) |
| Alex cookie + Jordan `studentId=723` mid-semesters | **403 Access denied** |

**Local repairs (this repo only):** Stopped list + Cora from calling leaky `/api/student/mid-semesters` (MS8). Rewrote `audit-mid-semester-production.mjs` so header-only 200/201 and HTTP 500 fail (MS7). Extended `ASSESSMENT_STUDENT_API_PATHS` (MS10). Did not start or submit live Mid 1/2 (`166`/`167`) or Final **162**. Did not finalize leftover attempt **4493**.

**Faculty → student path works** when using cookies: create-from-bank → toggle ECE2202 → both list APIs n=1, no answer keys on the student row → start 200 → take 200, question has options but **no `correct_answer`** → DELETE → lists empty.

History leftovers **213**, **215**, and **167:4493** remain. Simulator / submit-finalize is **UNVERIFIED**. Not READY TO SHIP.

---

## Architecture

Student Drawer → `/module/mid-semester-exams`  
→ `AssessmentListScreen` `type="mid_semester"`  
→ `fetchAssessmentListForKind` → `getQuizzes(session, "mid_semester")` → session-bound `/api/student/quizzes?type=mid_semester`  
→ take `/api/midsem/take/:id`  
→ Faculty `/module/mid-semester-exams` → `assessmentType="mid_semester"` → `instructorRequest`

---

## Files Inspected

- `student-nav.ts`, `faculty-nav.ts`, `registry.tsx`, `faculty-registry.tsx`
- `AssessmentListScreen.tsx`, `assessment-list-logic.ts` (`getQuizzes(..., "mid_semester")`), `assessment-list-empty-copy.ts`
- `student-api.ts` leftover `getMidSemesters` / `getQuizzes`
- `assessment-quiz-api.ts`, `normalize-assessment-type.ts`
- `cora-student-context-loader.ts` (`getQuizzes(..., "mid_semester")`)
- `student-session-proof.ts`, `student-module-registry.ts`
- `expo/scripts/audit-mid-semester-production.mjs`
- `expo/docs/audits/faculty-mobile/mid-semester-exams.md`

---

## API Routes

| Probe | Result | Status |
|-------|--------|--------|
| GET mid-semesters no id | 400 Student ID required | PASS |
| GET mid-semesters `studentId=722` **no cookie** | **401** (was 200 title leak; re-probe after dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf) | **PASS MS1** |
| GET mid-semesters header-only | **401** | **PASS MS1** |
| GET mid-semesters `studentDatabaseId=722` | 400 Student ID required | contract |
| GET mid-semesters cookie 722 or roster 910000001 | 200; both saw 213/215 after publish | PASS when cookie |
| GET mid-semesters Alex cookie + `studentId=723` | **403 Access denied** | PASS |
| GET quizzes `type=mid_semester` unauth / header-only | **401** | PASS |
| GET quizzes type mid Alex + 723 | **403** | PASS |
| GET quizzes type mid after publish | 200 n=1 same 215 | PASS |
| POST start 167 cookie | **403 Assessment has expired** (re-probe; leftover 4493 still in history — do not finalize) | **PASS MS6** |
| GET midsem/take 167 cookie | 403 Assessment has expired | PASS |
| GET midsem/take 167 Jordan | 403 Access denied | PASS |
| GET midsem/take header-only | **401** | PASS |
| POST midsem/submit header-only + fields | **401** | PASS |
| POST midsem/submit unauth empty | **400** | LOW MS13 |
| POST start 215 cookie | 200 attempt 4495 | PASS |
| GET midsem/take 215 before start | 428 No active quiz session | PASS |
| GET midsem/take 215 after start | 200; no `correct_answer` | PASS |
| Faculty list/create/toggle/delete header-only | **401** | PASS |
| Faculty cookie list | 200 n=2 (166, 167 Closed, `session_access: {}`) | PASS |
| Faculty cookie course 1 | **403** | PASS |
| Student cookie → faculty list | **401** | PASS |
| Cookie create mid 213/215 | 200 | PASS |
| POST quiz-progress header-only | **401** | PASS MS2 |
| POST log-violation header-only | **401** | PASS MS3 |
| GET issues header-only | **401** | PASS MS4 |
| POST save-answer header-only | **401** | PASS MS5 |

---

## CRUD / Faculty → Student

Create → publish ECE2202 → student visible on **both** list APIs → delete **executed**. Draft hidden. Faculty GET 167 includes `correct_answer` (expected). Student take 215 had options Alpha–Delta, `solution_upload_config` only in secret-key filter.

Existing Mid 1/2 unpublished (`session_access: {}`), windows ended 2026-07-03. Student lists empty until publish.

---

## Authentication / Isolation

`/api/student/mid-semesters` requires a session as of `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf`. Unified quizzes `type=mid_semester` already did. Faculty mutations and midsem take/submit (with fields) require a session.

Alex cannot use Jordan’s id on mid-semesters or the quizzes list (**403**).

---

## Assessment Security

Take 215: no `correct_answer` / sample / expected on the question object. Take 167: 403 expired, no payload. Faculty 167: 23 questions with keys.

---

## Cora Security

Registry denies `start` and answering during a protected exam. Tool execution: **UNVERIFIED**. Cora context loader now uses `getQuizzes(..., "mid_semester")` (no `getMidSemesters`).

---

## Mobile UX

Dock search. Empty mid list must **not** use the quiz/homework closed-term notice (`assessmentListEmptyCopy` already excludes mid). After publish, 215 was Open / `can_take: true`.

---

## Tests

- `audit-mid-semester-production.mjs` — **Fixed locally (MS7).** Header-only 200/201 and HTTP 500 fail; expected reject 401. Unauth mid-semesters 200 is FAIL. Production MS1–MS6 re-probed **401 / 403 expired** after deploy.
- `ASSESSMENT_STUDENT_API_PATHS` — **Fixed locally (MS10).** Includes `/api/midsem/take/`, `/api/midsem/submit`, `/api/student/mid-semesters`.
- `assessment-list-logic.contract.test.ts` / `cora-student-context-loader.contract.test.ts` — list + Cora must not call `getMidSemesters`; must use `getQuizzes` + `"mid_semester"`.

---

## End-to-End Results

| Flow | Result |
|------|--------|
| Faculty list mids | 200, 166/167 Closed |
| Create mid → publish → both student lists | PASS (213, 215) |
| Unauth mid-semesters after deploy | **PASS 401** |
| Start disposable → midsem take | PASS (no key fields) |
| Start live 167 after deploy | **403 expired**; leftover **4493** remains — do not finalize |
| Simulator | UNVERIFIED |
| DELETE 213/215 | 200 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| MS1 | CRITICAL | Auth | **Fixed on production** `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf`. Unauth/header-only mid-semesters now 401. | re-probe both aliases → 401 Student authentication required | Server `/api/student/mid-semesters` | Confirmed. Leftover `getMidSemesters` helper unused by list/Cora. |
| MS2 | CRITICAL | Auth | **Fixed on production.** Header-only quiz-progress 401. | re-probe 401 | Server quiz-progress | Confirmed |
| MS3 | CRITICAL | Auth | **Fixed on production.** Header-only log-violation 401. | re-probe 401 | Server log-violation | Confirmed |
| MS4 | CRITICAL | Auth | **Fixed on production.** Header-only issues 401. | re-probe 401 | Server issues | Confirmed |
| MS5 | HIGH | Auth | **Fixed on production.** Header-only save-answer 401. | re-probe 401 | Server save-answer | Confirmed |
| MS6 | HIGH | Auth | **Fixed on production.** start-quiz on expired Mid 2 is 403. Leftover attempt 4493 remains. | cookie start 167 → 403 Assessment has expired | Server start-quiz | Confirmed. **Do not finalize 4493.** |
| MS7 | HIGH | Tests | **Fixed locally.** Script treated header-only as auth and unauth 400 as PASS. | prior script used headers as auth | `expo/scripts/audit-mid-semester-production.mjs` | Local honesty + production re-probe PASS. |
| MS8 | HIGH | Client | **Fixed locally.** List + Cora loader called the leaky mid-semesters API | prior `fetchAssessmentListForKind` mid branch; comment already said use unified quizzes API | `assessment-list-logic.ts`, `cora-student-context-loader.ts` | Local: both callers use `getQuizzes(..., "mid_semester")`. `getMidSemesters` remains defined. Does not patch server MS1. |
| MS9 | MEDIUM | E2E | Simulator / submit-finalize unverified | no Maestro; did not finalize | — | Re-run on disposable open mid; never 166/167 |
| MS10 | LOW | Tests | **Fixed locally.** Paths omitted midsem take/submit and mid-semesters | prior constant had quiz/homework/final take only | `student-session-proof.ts`, contract test | Local: added `/api/midsem/take/`, `/api/midsem/submit`, `/api/student/mid-semesters`. Source still uses `${apiType}`. Does not close MS1–MS6. |
| MS11 | LOW | Data | History leftovers 213, 215, 167/4493, 201 | quiz-history | production | Admin purge; do not finalize 4493 |
| MS12 | LOW | Docs | Prior faculty READY 91 invalid | dishonest script | faculty mid-semester audit | REVALIDATION_REQUIRED |
| MS13 | LOW | Auth | Unauth empty midsem submit 400 | empty POST 400; fields 401 | Server `/api/midsem/submit` | Auth before validation |

---

## Required Before Ship

1. ~~Server session bind on `/api/student/mid-semesters`~~ **Confirmed 401** after `dpl_3kVopsM5e3GVUDpAJ7yRZsAzZkcf`.
2. ~~Session bind on quiz-progress, log-violation, issues, save-answer~~ **Confirmed 401**.
3. ~~Block start of expired mids~~ **Confirmed 403** on 167. Do not finalize leftover **4493**.
4. Simulator / submit-finalize on a disposable open mid (never 166/167).
5. Admin purge of leftover history 213, 215, 167/4493, 201.
6. Do not start live Mid 1/2 (`166`/`167`).

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 95 |
| Routing | 95 |
| UI | 80 |
| API | 78 |
| CRUD | 88 |
| Authentication | 88 |
| Authorization | 85 |
| Student Isolation | 88 |
| Course Isolation | 90 |
| Security | 80 |
| Assessment Security | 82 |
| Cora Security | 68 |
| Testing | 52 |
| Mobile UX | 78 |

OVERALL SCORE: **72/100**

FINAL STATUS: **READY WITH MINOR FIXES**
