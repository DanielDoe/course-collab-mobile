# Finals — Student Mobile Production Audit

```
MODULE: Finals (student) + Faculty Final Exams hub (required faculty implementation)
STUDENT ROUTE: /module/final-exams
NAVIGATION GROUP: Assessments. student-nav id final-exams, label Finals, icon school-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS["final-exams"] → AssessmentModuleScreen type="final" title="Final Exams"
PRIMARY SCREEN: AssessmentListScreen (type="final") in expo/src/components/assessments/AssessmentListScreen.tsx
RELATED SCREENS: AssessmentDetailScreen, AssessmentQuizScreen, AssessmentReportScreen, AssessmentIssuesSheet, AssessmentItemCard, AssessmentFilterBar. Faculty: FacultyAssessmentsScreen (assessmentType="final"), create/detail/editor/preview modals, FacultyIssuesScreen, FacultyDeletedAssessmentsScreen.
SUBROUTES: /assessment/[id]?type=final, /assessment/take/[id]?type=final, /assessment/report/[attemptId]
API ROUTES:
  GET  /api/student/quizzes?studentDatabaseId=&type=final
  GET  /api/student/finals?session=&studentId=
  GET  /api/student/issues
  POST /api/student/start-quiz
  GET  /api/final/take/:id
  GET  /api/student/quiz-attempt/:id
  POST /api/student/save-answer | quiz-progress | finalize-quiz | save-and-finish-later
  GET|POST|PATCH|DELETE /api/instructor/quizzes*
  GET /api/instructor/issues?assessment_type=final
  GET|POST|DELETE /api/instructor/deleted-items
SERVICES: student-api.ts (list), assessment-quiz-api.ts (take), assessment-issues-api.ts, instructor-api.ts
DATABASE MODELS: UNVERIFIED directly. Inferred: quizzes (assessment_type=final), quiz_questions, quiz_attempts, quiz_session_access, issues, deleted_items
MEMBERSHIP: Nav unlocked for all student tiers. No server membership gate observed on list/start.
CORA INTEGRATION: student-module-registry final-exams allowed read/explain/navigate; denied solve_during_protected_exam / retrieve_answers_during_exam. Faculty: assessment.create/update/publish.
FACULTY DEPENDENCY: Faculty Expo Final Exams is the upstream writer (create from bank, section toggle, editor). This run includes that hub because invocation scoped Faculty Expo + student downstream.
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: student-nav remaps final-exams → /student/dashboard-v2/final-exams; faculty web /faculty/dashboard/assessments/finals
```

Size: LARGE (faculty manage/create/publish, student list/detail/take, auth/IDOR, answer keys, Cora registry, deleted/issues)  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`  
Manifest: `docs/audits/student-mobile/final-exams/manifest.json`

Invocation named **student-mobile-module-audit** / **Finals**. Scope line is Faculty Expo/mobile plus required backend and student-facing downstream. Faculty Final Exams hub is in scope. Shared take engine is shared with quizzes/homework/mid-semester — this report only scores the `assessmentType="final"` path.

Execution: production HTTPS probes with review roster (Alex ECE `910000001` / db `722` / Scholar, Jordan db `723`, ELEG twin `734`, faculty `mchen` / instructor `15`, course `16` / session `ECE2202`, foreign course `1`). Simulator UI / theme: **UNVERIFIED**. Database rows: **UNVERIFIED** except via API responses. Disposable finals **199 / 201 / 203** were created and deleted in this run. Live **Final Exam 1** (id `162`) was not started or submitted.

A prior faculty-mobile report marked this module READY TO SHIP (89/100) using `audit:final-exams-production`, which treats header-only `x-instructor-id` as authentication and treats create `500` as PASS. This run **rejects that result**.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **42/100**  
Blockers: 0  
Critical: 4  
High: 4  
Medium: 3  
Low: 2

Student Finals is reachable, points at production HTTPS, and the native list → detail → start → take path exists. Faculty Expo can create a `assessment_type=final` from the question bank, toggle `ECE2202`, and the review student then sees that final with `can_take: true`. Unpublished live **Final Exam 1** (id 162, `is_active: false`, empty `session_access`) correctly stays hidden from students.

**Production still treats a roster/database id as a student login** on `/api/student/finals` and `/api/student/quizzes`. **Production still treats `x-instructor-id` + `x-course-id` as a faculty login** for list, detail (including **40 answer keys** on quiz 162), create, section toggle, and delete. Header-only `POST /api/student/start-quiz` starts an attempt. The Expo list client already refuses header-only identity; the **take client and issues client do not**.

Until the web API is deployed with session bind, this module cannot ship.

---

## Architecture

Student Drawer (`Assessments` → Finals)  
→ `/module/final-exams`  
→ `registry.tsx` `final-exams`  
→ `AssessmentListScreen` type=`final`  
→ dock search + All/Open/Done + issues sheet  
→ `/assessment/[id]` detail · `/assessment/take/[id]` native quiz  
→ list: `studentApi.getQuizzes` (`studentRequest` — cookies + MFA + `x-cc-refresh`)  
→ take: `assessmentQuizApi` (**header-only** `x-student-id` / `x-student-session`)  
→ production quizzes / attempts  
→ production server binds **query `studentId` / `studentDatabaseId` or `x-student-id`**  
→ Faculty Drawer `Final Exams` → `FacultyAssessmentsScreen` (`assessmentType="final"`)  
→ `instructorApi` (client session-proof) → production still accepts **header-only instructor id**

---

## Files Inspected

- `expo/src/constants/student-nav.ts`, `faculty-nav.ts`
- `expo/src/modules/registry.tsx`, `faculty-registry.tsx`, `native-screens.tsx`
- `expo/src/components/assessments/AssessmentListScreen.tsx`, `AssessmentDetailScreen.tsx`, `AssessmentQuizScreen.tsx`, `AssessmentFilterBar.tsx`, `assessment-list-logic.ts`, `assessment-navigation.ts`, `assessment-config.ts`, `assessment-detail-logic.ts`
- `expo/app/(app)/assessment/[id].tsx`, `take/[id].tsx`, `report/[attemptId].tsx`
- `expo/src/lib/student-api.ts`, `assessment-quiz/assessment-quiz-api.ts`, `assessment-issues-api.ts`, `instructor-api.ts`, `student-dashboard-stats.ts`, `student-session-proof.ts`
- `expo/src/components/faculty/FacultyAssessmentsScreen.tsx`, `FacultyIssuesScreen.tsx`, create/detail/editor/preview/deleted screens
- `expo/src/lib/cora/student-module-registry.ts`, `faculty-module-registry.ts`
- `expo/scripts/audit-final-exams-production.mjs`
- Prior `expo/docs/audits/faculty-mobile/final-exams.md` (not trusted)

---

## Navigation & Routing

**Status:** PASS (traced)

- Student drawer **Finals** → `/module/final-exams` (`student-nav.ts`).
- Registry `final-exams` → `AssessmentModuleScreen type="final"`.
- Does not resolve a faculty screen.
- Faculty drawer **Final Exams** → `/module/final-exams` → `assessmentModule("final")`.
- Deep links: faculty `?segment=issues|deleted` via `parseAssessmentSegment`.
- Student take/detail/report file routes exist.
- Membership: no `minTier` on student or faculty nav.

Simulator drawer tap / back / restore: **UNVERIFIED**.

---

## Production Configuration

Production API verified: YES (`https://coursecollab.vercel.app` via `getApiBaseUrl()` / `API_BASE_URL`)  
Development URLs: none in finals list/take/faculty hub source  
Mock dependencies: none on this path

---

## Screens

| Screen | Role | Status |
|--------|------|--------|
| AssessmentListScreen | Student finals list | ACTIVE (traced; production list empty until faculty publish) |
| AssessmentDetailScreen | Start / continue / report | ACTIVE (traced) |
| AssessmentQuizScreen | Native take | ACTIVE (start-then-take traced; live take **UNVERIFIED**) |
| AssessmentReportScreen | Results | ACTIVE (not executed) |
| AssessmentIssuesSheet | Report / comments | ACTIVE (API query-id) |
| FacultyAssessmentsScreen | Manage hub | ACTIVE |
| Faculty create/editor/preview/detail | CRUD | ACTIVE (API create/toggle/delete executed) |
| FacultyIssuesScreen / Deleted | Segments | ACTIVE (issues empty; deleted list empty after trash) |

---

## Components

| Component | Class |
|-----------|--------|
| AssessmentFilterBar + StudentSearchToolbar dock | ACTIVE |
| AssessmentItemCard | ACTIVE |
| FacultyAdaptiveSegmentNav / FacultySearchToolbar dock | ACTIVE |
| FacultyAssessmentCard + section toggles | ACTIVE |
| assessment-quiz-api header-only client | ACTIVE (auth hole) |
| assessment-issues-api no-auth client | ACTIVE (auth hole) |
| studentApi.getFinals | LEGACY for list (dashboard/Cora still call it) |
| PracticeQuizWebScreen / web take | N/A (native take used) |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Finals nav | Student drawer | registry | — | Open list | Traced | PASS |
| Search / All Open Done | List dock | local filter | none | Filter titles/status | Traced | PASS |
| Issues (+) | List dock | AssessmentIssuesSheet | `/api/student/issues` | Open sheet | Query-id 200 | FAIL auth |
| Card press | List | detail or continue | getQuizzes | Open detail | Traced | PASS |
| Start / Continue | Detail | openAssessmentTake | start-quiz + take | Native quiz | start header-only 200 | FAIL auth |
| Faculty create (+) | Manage | createQuizFromBank | create-from-bank | New final | Header-only 200 quiz 201 | FAIL auth |
| Section toggle | Card | toggleQuizSession | PATCH toggle-session | Publish section | Header-only 200; student then saw row | FAIL auth / PASS contract |
| Faculty delete | Card | deleteQuiz | DELETE quiz | Trash | Header-only 200 | FAIL auth |
| Refresh | List / manage | load() | same GETs | Reload | Traced; manage catch shows banner | PASS traced |

---

## Menus / Action Sheets

Faculty delete confirm and clone confirm exist (`AppAlert`). Create / editor / preview are sheets. Student issues sheet has report + comments. None executed on simulator. **UNVERIFIED UI**.

---

## Modals

Faculty create/editor/preview/detail: traced. Cora pending `quiz_create` now checks `pending.assessmentType === assessmentType`. Second-open stale state: **UNVERIFIED**.

---

## Forms

| Form | Client validation | Server validation | Status |
|------|-------------------|-------------------|--------|
| Faculty create from bank | title + ≥1 question (modal) | create 200 with 1 bank id | PARTIAL |
| Editor draft | `validateQuizEditorDraft` | UNVERIFIED | UNVERIFIED |
| Student issue report | non-empty description | UNVERIFIED | UNVERIFIED |
| Take answers | mapper + circuit upload | UNVERIFIED | UNVERIFIED |

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/student/finals?session=&studentId=` | dashboard + getFinals | **None → 200**. Header optional | Claimed studentId | none | session query | **CRITICAL** |
| GET | `/api/student/quizzes?studentDatabaseId=&type=final` | list | **Query-only → 200**. Cookie unused for identity | Claimed db id | none | enrollment of claimed id | **CRITICAL** |
| GET | `/api/student/issues` | issues sheet | **Query-only → 200** | claimed studentId | none | optional courseId | **CRITICAL** |
| POST | `/api/student/start-quiz` | take screen | Unauth **401**. Header-only **200** | claimed x-student-id | none | quiz section | **CRITICAL** |
| GET | `/api/final/take/:id` | take screen | 428 without start | — | — | — | PARTIAL |
| GET | `/api/student/quiz-attempt/:id` | take | Unauth 401. Header-only **200** | claimed id | none | — | FAIL auth |
| POST | `/api/student/save-answer` | take | Unauth **404** not 401 | — | — | — | FAIL auth |
| GET | `/api/instructor/quizzes?assessment_type=final` | faculty list | Unauth 401. Cookie-only 401. Header-only **200** | instructor+course headers | none | course 1 → 403 | **CRITICAL** |
| GET | `/api/instructor/quizzes/:id` | editor/preview | Header-only **200** + **correct_answer** | same | none | course scoped | **CRITICAL** |
| POST | `/api/instructor/quizzes/create-from-bank` | create modal | Header-only **200** | course 1 → 403 | none | course header | **CRITICAL** |
| PATCH | toggle-session | section toggle | Header-only **200** | same | none | — | **CRITICAL** |
| DELETE | `/api/instructor/quizzes/:id` | delete | Header-only **200** | same | none | — | **CRITICAL** |
| GET | `/api/instructor/deleted-items?type=final` | deleted segment | Header-only 200, empty after trash | — | — | — | PARTIAL |
| GET | `/api/instructor/question-bank*` | create | Header-only 200 | course scoped | — | — | FAIL auth |

Student cannot call faculty quiz routes with `x-student-id` (401). That is not a substitute for instructor session bind.

---

## CRUD

| Operation | Supported | Traced | Executed | Status |
|-----------|-----------|--------|----------|--------|
| Faculty create | Yes | Yes | Yes (201, 203) | PASS contract / FAIL auth |
| Faculty read | Yes | Yes | Yes (162, 201) | FAIL auth + answer leak |
| Faculty publish (section) | Yes | Yes | Yes ECE2202 | PASS contract / FAIL auth |
| Faculty delete | Yes | Yes | Yes | PASS contract / FAIL auth |
| Faculty restore | Yes (client) | Yes | Deleted list empty | UNVERIFIED |
| Student list | Yes | Yes | Yes (0 then 1 then 0) | PASS contract / FAIL auth |
| Student start | Yes | Yes | Header-only 200 | FAIL auth |
| Student take questions | Yes | Yes | 428 until start; not fully taken | UNVERIFIED |
| Student submit | Yes | Yes | No | UNVERIFIED |

---

## Authentication

**FAIL.**

| Probe | Result |
|-------|--------|
| GET `/api/student/finals` no params | 400 session required |
| GET `/api/student/finals?session=ECE2202&studentId=722` no cookie | **200** `finals: []` |
| GET `/api/student/quizzes?studentDatabaseId=722&type=final` no cookie | **200** |
| Cookie-only quizzes without query id | 400 (cookie is not identity) |
| Cookie + Jordan `studentDatabaseId=723` | 200 (empty; identity still query) |
| Faculty list no headers | 401 |
| Faculty list cookie-only (mchen MFA trust) | 401 |
| Faculty list `x-instructor-id:15` + `x-course-id:16` | **200** quiz 162 |
| Unknown instructor 999999 | 401 |
| Student login `910000001` / `Review26!` | 200, cookies `cc_refresh` + `cc_mfa_trust`, db 722 |
| Faculty login `mchen` / `Review26!` | 200, cookie `cc_mfa_trust` |

Local list/dashboard clients already call `requireStudentSessionProof`. Production ignores that.

---

## Student Authorization

Student header cannot list or open faculty quiz 162 (**401**). Students cannot create finals through instructor routes with a student header.

Students **can** start a final attempt by sending `x-student-id` only. That is an authorization failure.

---

## Cross-Student Isolation

**FAIL (identity spoof).** Review finals catalogs were empty except during disposable publish, so classmate grade/attempt leak was not demonstrated. Isolation cannot PASS: the server uses the caller-supplied id.

`GET /api/student/quiz-attempt/162?studentId=722` with only `x-student-id: 722` returned attempt telemetry (attemptId, timers, flagged/answered ids).

---

## Course / Section Isolation

| Probe | Result |
|-------|--------|
| Faculty course 16 | 1 live unpublished final (162) |
| Faculty course 15 (ELEG) | 0 finals |
| Faculty course 1 | **403** |
| Student ELEG db 734 list | 200 empty |
| Publish only ECE2202 on quiz 201 | Alex ECE list showed 201 |
| After trash | student list empty again |

Section isolation on student list **PASS** for this disposable. Faculty foreign-course create **403**. Identity remains header-spoofable for courses the claimed instructor owns.

---

## Membership Enforcement

No `minTier` on Finals. Scholar Alex listed and received `can_take: true` after publish. Membership tamper headers ignored (list still 200). No Trailblazer-only finals feature observed. **N/A / PASS nav.**

---

## Security

THE MOBILE CLIENT IS UNTRUSTED. Production currently trusts:

- `studentId` / `studentDatabaseId` query
- `x-student-id`
- `x-instructor-id` + `x-course-id`

`audit-final-exams-production.mjs` encodes that mistake (header helpers as “auth”, create `500` as PASS).

---

## Assessment Security

| Check | Result |
|-------|--------|
| Student list JSON answer keys | none on disposable 201 |
| Unpublished 162 visible to students | no (`is_active: false`, empty session_access) |
| Faculty GET 162 questions | **40 questions** with `correct_answer`, `bank_correct_answer`, `bank_explanation`, `ai_expected_solution`, `bank_expected_answer` |
| Take without start | 428 `attempt_required` — no questions |
| Start then full take | **UNVERIFIED** (did not keep a published final) |
| Device time bypass | UNVERIFIED |

Premature answer leakage to anyone who can send instructor headers is **CRITICAL**.

---

## Cora Security

Registry only. Student `final-exams` denies `solve_during_protected_exam` and `retrieve_answers_during_exam`. Tool-level enforcement **UNVERIFIED**. Faculty Cora pending type guard is present in `FacultyAssessmentsScreen`.

---

## Database Integrity

Soft-delete message: “Quiz moved to trash successfully.” Immediate `GET /api/instructor/deleted-items` and `?type=final` returned **0 rows**. Restore/purge **UNVERIFIED**. Direct DB **UNVERIFIED**.

---

## Files / Documents

Question media upload: `uploadQuestionMedia` sends `x-instructor-id` / `x-course-id` **without** the session-proof gate used by `instructorRequest`. Circuit solution upload on take is header-only. Not executed.

---

## Notifications

`useNotificationModuleRefresh(["assessments", "issues"])` on student list and faculty manage. Registry maps `final-exams` → assessments/issues. Push E2E **UNVERIFIED**.

---

## Mobile UX

Dock search via default `StudentSearchToolbar` / `FacultySearchToolbar` `placement="dock"`. Grouped list + status pills with labels. Simulator / keyboard / safe area **UNVERIFIED**.

---

## Theme

Uses `NATIVE` / themed student tokens / `FacultyStatusPill`. Light/dark **UNVERIFIED** on device.

---

## Accessibility

Icon-only issues (+) has `accessibilityLabel`. Faculty section toggles have labels. Screen reader / dynamic type **UNVERIFIED**.

---

## Errors / Loading / Empty States

Student empty: “No final exams yet” + Refresh. Manage load/refresh catch sets a banner. Delete/toggle failures use `AppAlert`. Take 428 surfaces start-required. Offline **UNVERIFIED**.

---

## Performance

List is `.map` not virtualized — acceptable for typical final counts. Faculty manage loads quizzes + sessions + issue count + deleted count in parallel.

---

## Web / Mobile Integration

Web paths mapped. Native take is the student path (not WebView). Web create → mobile list this session: proven via API, not web UI.

---

## Faculty → Student Integration

**Contract PASS. Auth FAIL.**

1. Header-only create `assessment_type: final` → quiz 201.  
2. Student list before toggle: not visible.  
3. PATCH toggle `ECE2202` `is_active: true`.  
4. Student list: one row, `can_take: true`, no answer keys.  
5. DELETE → student list empty.  
6. Live 162 remains unpublished — students do not see it.

---

## Tests

| Kind | Coverage |
|------|----------|
| Expo contract tests | none for take/issues/finals |
| `audit:final-exams-production` | **false PASS** (header-only = auth) |
| Maestro `faculty-finals*.yaml` | exist, not re-run |
| sim-audit junit | none |

---

## End-to-End Results

| Step | Executed | Status |
|------|----------|--------|
| Open Finals from student drawer | No (sim) | UNVERIFIED UI |
| Faculty create from bank | Yes | PASS (header-only) |
| Publish section | Yes | PASS contract |
| Student sees final | Yes | PASS contract |
| Student start | Yes (header-only) | FAIL auth |
| Student answer + submit | No | UNVERIFIED |
| Issues / restore | List empty | UNVERIFIED |
| Cleanup delete | Yes | PASS |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| No session + victim studentId on finals | **200** |
| No session + victim databaseId on quizzes?type=final | **200** |
| Cookie + other studentDatabaseId | 200 (empty catalog) |
| Header-only instructor list/detail/create/delete | **200** |
| Faculty cookie-only | 401 |
| Foreign course 1 list/create | 403 |
| Unknown instructor | 401 |
| Student header → faculty quiz | 401 |
| Header-only start-quiz | **200** |
| Unauth start-quiz | 401 |
| Unauth save-answer | **404** (not 401) |
| Membership header tamper | ignored |
| Unpublished 162 on student list | hidden |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| FE1 | CRITICAL | Auth | Production student finals/quizzes list accepts query `studentId` / `studentDatabaseId` with no cookie. Cookie is not identity. | 2026-08-18: unauth finals+session+id **200**; unauth quizzes+dbId+type=final **200**; cookie without query **400** | production `/api/student/finals`, `/api/student/quizzes` | Deploy session bind (`requireCallerStudentDbId`). Re-prove: no cookie 401; cookie+other id 403; cookie+own 200 |
| FE2 | CRITICAL | Auth / escalation | Production faculty quiz APIs accept `x-instructor-id` + `x-course-id`. Cookie-only 401. Header-only listed 162, created 199/201/203, toggled, deleted. | 2026-08-18 probes | production `/api/instructor/quizzes*` | Deploy `requireInstructorSession`. Header-only must 401 |
| FE3 | CRITICAL | Assessment security | Header-only faculty GET quiz 162 returns 40 questions including `correct_answer` and bank solutions. | GET `/api/instructor/quizzes/162` header-only 200 | production quiz detail | Session bind + never expose keys without instructor session |
| FE4 | CRITICAL | Auth | Header-only `POST /api/student/start-quiz` returns 200 and creates an attempt. Unauth is 401. | start 201 → 200 attemptId | production start-quiz; `assessment-quiz-api.ts` L13–19 | Server: session only. Client: `studentAuthenticatedHeaders` |
| FE5 | HIGH | Client auth | `assessmentQuizApi` sends only `x-student-id` / `x-student-session` — no cookies, refresh, MFA, or `credentials: "include"`. | `assessment-quiz-api.ts` L13–28 vs `student-api.ts` `studentRequest` | same | Use `studentAuthenticatedHeaders` + persist cookies |
| FE6 | HIGH | Client auth | `assessmentIssuesApi` sends query `studentId` and no session headers. Unauth GET **200**. | `assessment-issues-api.ts` L26–59; U6 200 | same | `studentAuthenticatedRequest` |
| FE7 | HIGH | Client auth | `uploadQuestionMedia` is header-only and skips `instructorRequest` session proof. | `instructor-api.ts` L2128–2136 | same | Reuse instructor session-proof headers |
| FE8 | HIGH | Testing | `audit-final-exams-production.mjs` treats header-only as auth and create `500` as PASS. Prior faculty audit used that 10/10. | script L38–90; faculty report READY 89 | `expo/scripts/audit-final-exams-production.mjs` | Header-only 200 must FAIL. Do not pass 500 |
| FE9 | MEDIUM | Data integrity | Soft-delete returns success but `deleted-items` (all and `type=final`) is empty immediately. Restore/purge UNVERIFIED. | DELETE 201/203 200; deleted list n=0 | production deleted-items | Confirm trash visibility; do not invent a client workaround |
| FE10 | MEDIUM | Testing | No Expo contract tests for finals take/issues auth. | glob `*assessment*.test*` empty | expo tests | Add path + client contract tests |
| FE11 | MEDIUM | API | `studentApi.getFinals` is unused by the list (uses `getQuizzes(..., "final")`) but dashboard/Cora still call the public finals route. | `assessment-list-logic.ts` L16–18; dashboard-stats L68–70 | keep one source of truth after FE1 | — |
| FE12 | LOW | UX | Simulator / light-dark / a11y not executed. | this run | — | Run module-deep-test on Finals + Faculty Final Exams |
| FE13 | LOW | Performance | Manage/student lists are `.map` not virtualized. | FacultyAssessmentsScreen / AssessmentListScreen | accept unless lists grow | — |

---

## Required Before Ship

1. **Deploy** student session bind for `/api/student/finals`, `/api/student/quizzes`, `/api/student/issues`, `/api/student/start-quiz`, take/attempt/save/finalize. Re-prove query-only and header-only → **401**.  
2. **Deploy** instructor session bind for `/api/instructor/quizzes*`, issues, deleted-items, question-bank used by create. Re-prove header-only → **401**; cookie + own course → 200; cookie + course 1 → 403.  
3. Re-prove faculty quiz detail does not return answer keys without a session.  
4. Ship Expo take + issues + media-upload clients that fail closed without cookies (FE5–FE7).  
5. Replace the false-PASS production audit script (FE8).  
6. Re-run create → publish → student list → start → take → submit on a disposable final after the deploy.

---

## Future Improvements

- sim-audit + Maestro faculty-finals / student STU Test Final  
- Virtualize lists if a course accumulates many finals  
- Confirm single student list source (`getQuizzes` vs `getFinals`) after session bind  

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 88 |
| UI | 78 |
| Buttons | 70 |
| API | 32 |
| CRUD | 68 |
| Authentication | 18 |
| Authorization | 38 |
| Student Isolation | 22 |
| Course Isolation | 72 |
| Membership | 86 |
| Production Configuration | 92 |
| Data Integrity | 58 |
| Security | 24 |
| Assessment Security | 36 |
| Cora Security | 48 |
| Error Handling | 76 |
| Mobile UX | 80 |
| Performance | 82 |
| Accessibility | 70 |
| Testing | 22 |

OVERALL SCORE: 42/100

FINAL STATUS: BLOCKED BY SECURITY / DATA ISSUE

Audited at: 2026-08-18T03:15:00.000Z  
Commit: dba7f46  
Production: https://coursecollab.vercel.app  

Dependencies recorded: student-api, assessment-quiz-api, assessment-issues-api, instructor-api, student-session-proof, assessment-list-logic, FacultyAssessmentsScreen, AssessmentListScreen, AssessmentQuizScreen, faculty-registry, student-nav, faculty-nav, cora student/faculty module registries, /api/student/finals, /api/student/quizzes, /api/student/start-quiz, /api/instructor/quizzes

Prior faculty-mobile `final-exams` READY TO SHIP entry requires **REVALIDATION_REQUIRED**.
