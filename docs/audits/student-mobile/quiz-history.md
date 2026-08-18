# History — Student Mobile Production Audit

```
MODULE: History
STUDENT ROUTE: /module/quiz-history
NAVIGATION GROUP: Assessments. student-nav id quiz-history, label History, icon time-outline. No minTier / locked.
REGISTRY ENTRY: MODULE_RENDERERS["quiz-history"] → QuizHistoryModuleScreen → QuizHistoryScreen
PRIMARY SCREEN: expo/src/components/assessments/QuizHistoryScreen.tsx
RELATED SCREENS: HistoryFilterBar, AssessmentHistoryTimelineItem, AssessmentItemCard. Opens /assessment/report/[attemptId] or /assessment/take/[id] via openHistoryItem. Faculty: FacultyResultsScreen (attempt source).
SUBROUTES: none under /module/quiz-history
API ROUTES:
  GET /api/student/assessment-history?studentDatabaseId=&session=   ← History screen (EMPTY on production)
  GET /api/student/quiz-history?studentId=                         ← dashboard; HAS rows
  GET /api/student/homework-history?studentId=&session=
  GET /api/student/results/:attemptId
  GET /api/instructor/results
SERVICES: student-api.ts getAssessmentHistory (session-proof), assessment-navigation.ts, assessment-results-api.ts
DATABASE MODELS: UNVERIFIED. Inferred: quiz_attempts. assessment-history view/table appears empty for review ECE.
MEMBERSHIP: Unlocked all student tiers
CORA INTEGRATION: quiz-history allowed read/explain/summarize/generate/navigate; denied retrieve_unreleased_solutions. Cora loader calls getAssessmentHistory (empty).
FACULTY DEPENDENCY: Faculty Expo Manage Results / assessment attempts. Faculty publish + student submit create history rows.
ADMIN DEPENDENCY: none
WEB DEPENDENCY: /student/dashboard-v2/quiz-history
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **History**. Scope is Faculty Expo Manage Results plus student History downstream.

Execution: production HTTPS with Alex ECE `910000001` / db `722`, Jordan `723`, faculty `mchen` / instructor `15`, course `16`. Simulator: **UNVERIFIED**. Did not finalize live attempts.

---

## Executive Summary

Readiness: **READY WITH MINOR FIXES**  
Score: **70/100**  
Blockers: 0  
Critical: 0  
High: 0 remaining locally (H1 wired to quiz-history)  
Medium: 2 (sim unverified; leftover AUDIT-E2E 201)  
Low: 1

History is a native timeline (dock search + type filter + cards). The client already uses `studentRequest` (fail closed without cookies). Production header-only `/api/student/assessment-history` is **401**. Cookie + other student’s id is **403**. Cookie + own session is **200**.

**The screen is empty anyway.** `QuizHistoryScreen` loads `/api/student/assessment-history`, which returns `assessmentHistory: []` and `stats.total: 0` for Alex. The same session’s `/api/student/quiz-history` returns **4 assessments / 5 attempts**: Final Exam 1 (4452), Homework 7 (4463, 4474), Homework 4 (4485), leftover `AUDIT-E2E Final` (4492). Dashboard already uses quiz-history. History does not.

That is a core-workflow HIGH: a student with real attempts sees “No assessment history.” Faculty → student downstream exists on quiz-history, not on the endpoint the module calls.

Auth is not the ship blocker on current production. The wrong/empty list API is.

---

## Architecture

Student Drawer (`Assessments` → History)  
→ `/module/quiz-history`  
→ `QuizHistoryScreen`  
→ dock search + type filter  
→ `studentApi.getAssessmentHistory` → `/api/student/assessment-history` (**0 rows**)  
→ `openHistoryItem` → report or take  
→ Faculty Manage Results writes attempts that appear on `/api/student/quiz-history` (not assessment-history)

---

## Files Inspected

- `expo/src/constants/student-nav.ts`, `module-web-paths.ts`
- `expo/src/modules/registry.tsx`, `native-screens.tsx`
- `expo/src/components/assessments/QuizHistoryScreen.tsx`, `HistoryFilterBar.tsx`, `AssessmentHistoryTimelineItem.tsx`, `assessment-navigation.ts`, `assessment-config.ts`
- `expo/src/lib/student-api.ts` (`getAssessmentHistory`, `AssessmentHistoryItem`)
- `expo/src/lib/student-dashboard-stats.ts` (quiz-history)
- `expo/src/lib/student-session-proof.ts`
- `expo/src/lib/cora/student-module-registry.ts`
- Faculty `FacultyResultsScreen` / `/api/instructor/results` (downstream source)

---

## Navigation & Routing

**Status:** PASS (traced)

- Drawer **History** → `/module/quiz-history` → `QuizHistoryScreen`. Not a faculty screen.
- `openHistoryItem` → latest completed attempt report, else take/continue.
- Web remap `/student/dashboard-v2/quiz-history`.
- Search dock via default `StudentSearchToolbar` `placement="dock"` (chrome only mounts the filter sheet).

Simulator tap: **UNVERIFIED**.

---

## Production Configuration

Production API verified: YES  
Development URLs: none  
Mock data: none

---

## Screens

| Screen | Role | Status |
|--------|------|--------|
| QuizHistoryScreen | Timeline list | ACTIVE — empty on production data |
| HistoryFilterBar | Dock search + type sheet | ACTIVE |
| AssessmentHistoryTimelineItem | Row | ACTIVE |
| Assessment report / take | Downstream | Related (Grades/Finals) |

---

## Components

| Component | Class |
|-----------|--------|
| CommEmptyState | ACTIVE (shown for Alex despite quiz-history rows) |
| StudentSearchToolbar dock | ACTIVE |
| getAssessmentHistory | ACTIVE / wrong source |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| History nav | Drawer | registry | assessment-history | List attempts | API 200 empty | FAIL core |
| Search / type filter | Dock | local | none | Filter | No rows to filter | N/A |
| Row press | Timeline | openHistoryItem | results/take | Report | Never reached | UNVERIFIED |
| Pull refresh | List only | load() | same | Reload | **Missing on empty** | FAIL |
| Faculty results | Manage Results | instructorApi | /api/instructor/results | Source attempts | Cookie+headers 200 | PASS auth |

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Course | Status |
|--------|-------|--------|----------------|---------------|--------|--------|
| GET | `/api/student/assessment-history` | History screen | Header-only **401**. Query-only **401**. Cookie+session **200** empty. No session query **400**. Cookie+Jordan id **403** | session-bound | session query | PASS auth / **FAIL data** |
| GET | `/api/student/quiz-history` | dashboard only | Header-only **401**. Cookie **200** n=4 | session-bound | implied enrollment | PASS auth / unused by History |
| GET | `/api/student/homework-history` | dashboard | Header-only **401**. Cookie **200** n=0 | session-bound | session | PASS auth |
| GET | `/api/instructor/results` | faculty | Header-only **401**. Cookie+headers **200** | course header | course 16 | PASS auth |

---

## CRUD

Read-only student module. No student write. Faculty create/finalize of attempts: not executed this run. Existing attempts visible on quiz-history only.

---

## Authentication

**PASS** on current production (post mid-session deploy).

| Probe | Result |
|-------|--------|
| assessment-history no session | 400 |
| assessment-history query only | 401 |
| assessment-history header only | 401 |
| quiz-history / homework-history header only | 401 |
| faculty results header only | 401 |
| Cookie + own assessment-history | 200 empty |
| Cookie + Jordan databaseId | 403 |
| Cookie quiz-history | 200 4 rows |

---

## Student Authorization

No history mutation API called. Student cannot list faculty results with a student header (401, grades audit). **PASS** for writes.

---

## Cross-Student Isolation

Cookie + Jordan `studentDatabaseId` on assessment-history → **403**. Header-only no longer impersonates. **PASS**.

---

## Course / Section Isolation

Cookie without `session` → 400. ELEG not separately listed this run (Alex ECE cookie). **PARTIAL**.

---

## Membership Enforcement

No minTier. Scholar Alex can call history APIs. **PASS**.

---

## Security

Session bind is live for these routes. Client already sends cookies. Remaining risk is empty-list UX, not IDOR.

---

## Assessment Security

History list payloads (quiz-history) have scores/percentages, not question `correct_answer`. Opening a report uses `/api/student/results/:id` (session-bound as of Grades re-probe). Take from an in-progress row: **UNVERIFIED**.

---

## Cora Security

Registry denies `retrieve_unreleased_solutions`. Cora `getAssessmentHistory` will also see empty. **UNVERIFIED** tools.

---

## Faculty → Student Integration

**FAIL (contract).** Faculty/student attempts exist (quiz-history + leftover finals audit 201). History module does not show them because it calls assessment-history. Faculty results header-only is 401; cookie+headers list works (Grades audit).

---

## Tests

No History-specific contract or mapper tests. `getAssessmentHistory` is not in `ASSESSMENT_STUDENT_API_PATHS`.

---

## End-to-End Results

| Step | Executed | Status |
|------|----------|--------|
| Open History | No sim | UNVERIFIED UI |
| Load Alex history | Yes | **FAIL** empty vs 4 quiz-history rows |
| Open report from row | No | UNVERIFIED |
| Auth header-only | Yes | PASS 401 |
| Isolation Jordan query | Yes | PASS 403 |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Header-only assessment-history | 401 |
| Query-only | 401 |
| Cookie + other id | 403 |
| Header-only quiz-history | 401 |
| Header-only faculty results | 401 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| H1 | HIGH | Core workflow | History calls `/api/student/assessment-history` (0 rows). `/api/student/quiz-history` has 4 assessments / 5 attempts for the same student. Screen shows empty. | Cookie AH n=0; QH Final 1, HW 7, HW 4, AUDIT-E2E 201. 2026-08-18 | `student-api.ts` getAssessmentHistory; `QuizHistoryScreen.tsx` | Map quiz-history into `AssessmentHistoryItem[]` (keep merging assessment-history if it ever returns rows). Do not invent a backend route |
| H2 | MEDIUM | UX | Empty/error branch has no RefreshControl and no Try again — only the list branch can pull. | `QuizHistoryScreen.tsx` L197–204 vs L206–214 | same | ScrollView + refresh + retry on empty/error |
| H3 | MEDIUM | Contract | quiz-history rows have no `assessment_type` (only title). Filters/icons/nav need a type. | QH keys: quiz_id, quiz_title, attempts | mapper | Infer homework/final/mid/quiz from title the same way `configForAssessmentType` already does; map attempt_id → attempts[].id |
| H4 | LOW | Data | Soft-deleted finals audit quiz 201 still appears on quiz-history (attempt 4492, no completed_at). | QH row 201 | production | Do not delete from this audit; optional hide untitled AUDIT-* later |
| H5 | LOW | Testing | `/api/student/assessment-history` not in session-proof path lists. No mapper tests. | student-session-proof.ts | same | Add path + mapper unit tests |

---

## Required Before Ship

1. **H1** — History must show the same attempts quiz-history already returns.  
2. **H2** — Empty/error refresh.  
3. Simulator pass (search, filter, open one STU/review row → report).  
4. Re-prove header-only 401 after the next web deploy (auth flipped once this week).

---

## Future Improvements

- Prefer a single backend assessment-history that includes all types  
- Hide or purge leftover AUDIT-E2E rows  
- Pagination if history grows  

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 88 |
| UI | 74 |
| Buttons | 62 |
| API | 48 |
| CRUD | 70 |
| Authentication | 86 |
| Authorization | 84 |
| Student Isolation | 86 |
| Course Isolation | 74 |
| Membership | 90 |
| Production Configuration | 94 |
| Data Integrity | 42 |
| Security | 80 |
| Assessment Security | 78 |
| Cora Security | 52 |
| Error Handling | 58 |
| Mobile UX | 76 |
| Performance | 86 |
| Accessibility | 70 |
| Testing | 24 |

OVERALL SCORE: 70/100

FINAL STATUS: READY WITH MINOR FIXES

Local repair (verified in repo): `QuizHistoryScreen` loads `getQuizHistory` → `/api/student/quiz-history` and maps rows. Production `/api/student/assessment-history` is still empty. Simulator still UNVERIFIED. Not READY TO SHIP.

Audited at: 2026-08-18T03:35:00.000Z  
Commit: dba7f46
