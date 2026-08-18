# Attendance — Student Mobile Production Audit

```
MODULE: Attendance
STUDENT ROUTE: /module/attendance
NAVIGATION GROUP: Performance & Rewards. student-nav id attendance, label Attendance, icon checkbox-outline. No minTier / locked.
REGISTRY ENTRY: faculty-registry attendance → FacultyAttendanceScreen. Student registry attendance → AttendanceModuleScreen → AttendanceScreen
PRIMARY SCREEN (this scope): expo/src/components/faculty/FacultyAttendanceScreen.tsx
RELATED SCREENS:
  Faculty: FacultyAttendancePoliciesScreen (separate nav /module/attendance-policies)
  Student: AttendanceScreen (overview / records / leaderboard + code check-in)
SUBROUTES: none beyond /module/attendance
API ROUTES:
  Faculty: GET /api/instructor/attendance-roster
  GET /api/attendance/analytics|sessions|records
  POST /api/attendance/manual-override
  PUT|DELETE /api/attendance/records
  PUT /api/attendance/sessions
  POST /api/attendance/records/clear-all
  Student: GET /api/attendance/score|streaks|records|leaderboard
  POST /api/attendance/mark
  POST /api/attendance/manual-request
SERVICES: instructor-api.ts (session-proof), rewards-api.ts (session-proof via studentAuthenticatedRequest)
DATABASE MODELS: UNVERIFIED directly. Inferred: attendance_sessions, attendance_records, attendance_streaks
MEMBERSHIP: Unlocked all student tiers
CORA INTEGRATION: faculty attendance.createSession/inspect/correct; student check-in denied outside validation
FACULTY DEPENDENCY: Faculty Attendance is the upstream writer (roll call, cancel, log corrections)
ADMIN DEPENDENCY: raw x-admin-id grants requireInstructorAttendanceAccess
WEB DEPENDENCY: /student/dashboard-v2/attendance
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: working tree  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Attendance**. Scope is Faculty Expo Attendance plus required backend and student Attendance downstream.

Execution: production HTTPS probes + source read. Simulator: **UNVERIFIED**. Did not POST mark with a real code, did not POST clear-all with a section, did not POST manual-override with a live session.

Prior faculty audit (`expo/docs/audits/faculty-mobile/attendance.md`) scored 84 REQUIRES FIXES and treated unauth 401 as enough. That score is **rejected**. Header-only instructor **without** `x-course-id` and header-only student reads are live.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **41/100**  
Blockers: 0  
Critical: 3 (AT1 faculty header/admin login, AT2 records IDOR, AT3 leaderboard)  
High: 3 (AT4 mark header-as-login, AT5 streaks instructor bypass, AT6 clear-all header write)  
Medium: 1 (AT8 dishonest script)  
Low: 0

Faculty Expo sends `x-instructor-id` **and** `x-course-id`. With both, `resolveOptionalCourseScope` → `requireInstructorCourse` → live **401** without cookies. That is why unauth/header+course faculty list looks “locked.”

Omit `x-course-id` and `requireInstructorAttendanceAccess` treats `x-instructor-id: 15` as login: analytics **200** (flagged/top performers). `x-admin-id: 1` same. Student `x-student-id: 722` reads **Kolawole Abudu (351)** ELEG attendance (12 rows) and dumps ECE/ELEG leaderboards (46 / 50 names).

`rewards-api.ts` and `instructorRequest` already session-proof. Student score GET is already `requireBoundStudentCaller` on live (401). Do not re-fix those.

---

## Architecture

Faculty Drawer (`Assessments` → Attendance)  
→ `/module/attendance`  
→ `FacultyAttendanceScreen` (Overview / Roll / Meetings / Log)  
→ `instructorRequest`  
→ `/api/attendance/*` + `requireInstructorAttendanceAccess` (header actor; admin header bypass)  

Student Drawer (`Performance & Rewards` → Attendance)  
→ `AttendanceScreen`  
→ `rewardsApi` → `studentAuthenticatedRequest`  
→ score (session-bound) / streaks / records / leaderboard / mark (header identity)

---

## Files Inspected

- `expo/src/components/faculty/FacultyAttendanceScreen.tsx`
- `expo/src/lib/instructor-api.ts` L2415–2493
- `expo/src/lib/rewards-api.ts` L6–8, L266–300
- `expo/src/components/rewards/AttendanceScreen.tsx`
- `expo/scripts/audit-attendance-production.mjs`
- `v0-coursecollabv3/lib/instructor-attendance-auth.ts`
- `v0-coursecollabv3/app/api/attendance/{score,streaks,records,leaderboard,mark,analytics,sessions,manual-override,manual-request,records/clear-all}`
- `v0-coursecollabv3/app/api/instructor/attendance-roster/route.ts`

---

## Navigation & Routing

Student Performance & Rewards → Attendance. Faculty Assessments → Attendance. **PASS** (code-traced). Simulator: **UNVERIFIED**.

## Production Configuration

`https://coursecollab.vercel.app`. **PASS**.

## Screens

Faculty hub ACTIVE; refresh errors already bannered. Student overview/records/leaderboard/check-in ACTIVE; load errors surfaced. Search is `CollabSearch` under content (not dock) — noted, not a ship-blocker for this security run.

## API Routes

| Route | Live | Status |
|-------|------|--------|
| GET sessions/analytics header+course 15+16 | **401** Instructor authentication required | course-scope session |
| GET sessions/analytics `x-instructor-id:15` only | **200** | **AT1** |
| GET analytics `x-admin-id:1` | **200** | **AT1** |
| GET roster header-only 15 | **403** No roster | auth accepted |
| GET score?studentId=722 unauth/header | **401** | PASS (already bound) |
| GET streaks?studentId=722 header student | **401** | student path bound |
| GET streaks?studentId=722 `x-instructor-id:15` | **200** | **AT5** |
| GET records?studentId=722 header 722 | **200** n=0 | header login |
| GET records?studentId=351 header 722 | **200** n=12 Kolawole / ELEG1304P01 | **AT2** |
| GET leaderboard ECE / ELEG header 722 | **200** n=46 / n=50 names | **AT3** |
| POST mark header 722 | **400** Invalid or expired session | **AT4** |
| POST clear-all header 15 `{}` | **400** Section is required | **AT6** (would delete if section sent) |
| POST manual-override unauth / header | **401** (also wants Authorization) | still uses AT1 helper after header pair |

## Authentication / Isolation

Faculty with course header: session required (via `requireInstructorCourse`). Faculty/admin without course header: header is login. Student records/leaderboard/mark: header is login. Score: session required. Streaks: session required unless instructor header present.

Cross-student: 722 read 351’s 12 present/absent rows (name, section, status). Cross-course: ECE student listed ELEG leaderboard.

## Tests

`audit-attendance-production.mjs` treats header-only student records **200** as F-002 pass, treats unauth mark **400** as auth pass, does not fail header-only analytics 200 or records IDOR. Faculty sessions with course headers are 401 on live so F-002 already fails — not an honest student-IDOR gate.

---

## Production probes (2026-08-18)

| Probe | Result |
|-------|--------|
| GET sessions instructorId=15 no headers | **401** |
| GET sessions `x-instructor-id:15` `x-course-id:16` | **401** Instructor authentication required |
| GET sessions `x-instructor-id:15` only | **200** sessions n=0 |
| GET analytics header-only 15 | **200** flaggedStudents / topPerformers / … |
| GET analytics `x-admin-id:1` | **200** same keys |
| GET score?studentId=722 unauth / header | **401** |
| GET streaks header student 722 | **401** |
| GET streaks `x-instructor-id:15` studentId=722 | **200** streak object |
| GET records studentId=351 `x-student-id:722` | **200** n=12 Kolawole Abudu present ELEG1304P01 |
| GET leaderboard?section=ECE2202 header 722 | **200** n=46 (Sebastian G Trejo, …) |
| GET leaderboard?section=ELEG1304P01 header 722 | **200** n=50 (Daniel Doe, …) |
| POST mark header 722 sessionId=1 code XXXXX | **400** Invalid or expired session |
| POST clear-all header 15 `{}` | **400** Section is required |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected file | Required fix |
|----|----------|------|---------|----------|---------------|--------------|
| **AT1** | CRITICAL | Faculty auth | `requireInstructorAttendanceAccess` treats `x-instructor-id` as login and `x-admin-id` as full access. No `requireInstructorSession`. | `instructor-attendance-auth.ts` L32–55, L106–110; live header-only analytics/sessions 200; admin analytics 200 | `v0-coursecollabv3/lib/instructor-attendance-auth.ts` | `requireInstructorSession` first. Use `session.instructorId`. Remove admin-header bypass. Header-only without cookies → 401. |
| **AT2** | CRITICAL | Records IDOR | GET `/api/attendance/records` accepts any `x-student-id` then queries **any** `studentId`. No bind, no self-check. | `records/route.ts` L23–30, L83–106; live 722 → 351 n=12 | `records/route.ts` | Student: `requireBoundStudentCaller`; claimed id must be the caller. Instructor: AT1 session + existing course/session ACL. |
| **AT3** | CRITICAL | Leaderboard | Header student or instructor is enough. No course/enrollment check. ECE student listed ELEG names. | `leaderboard/route.ts` L187–201; live ECE n=46, ELEG n=50 | `leaderboard/route.ts` | Bind student or instructor session. Student section must match `resolveStudentCourseContextByDbId`. |
| **AT4** | HIGH | Check-in | `POST /api/attendance/mark` compares body `studentId` to raw `x-student-id`. | `mark/route.ts` L34–75; live header 722 → 400 not 401 | `mark/route.ts` | `requireBoundStudentCaller`. Use bound db id. Same for `manual-request/route.ts` (header-only, unauth 401). |
| **AT5** | HIGH | Streaks | If `x-instructor-id` or `Authorization` is set, student bind is **skipped**. | `streaks/route.ts` L20–26; live instructor header 200 | `streaks/route.ts` | Student: `requireBoundStudentCaller`. Instructor: `requireInstructorSession` (no raw header skip). |
| **AT6** | HIGH | Mass delete | `clear-all` treats raw `x-instructor-id` as enough, then soft-deletes a section. | `clear-all/route.ts` L10–36; live header `{}` → 400 Section required | `clear-all/route.ts` | `requireInstructorSession` + section/course ownership. Do **not** POST this with a real section on production. |
| **AT7** | INFO | Score | Student `?studentId=` already `requireBoundStudentCaller` on live (401). Section-only roster still trusts `x-instructor-id`. | `score/route.ts` L27–29, L71–76 | `score/route.ts` section branch only | Instructor section roster: `requireInstructorSession`. Do not rewrite the studentId branch. |
| **AT8** | MEDIUM | Tests | Script passes header-only student records 200; 400 mark as auth pass; no fail for header-only analytics 200 or 722→351 IDOR. | `audit-attendance-production.mjs` L86–95, L122–128 | same file | Instructor header+course 401 is PASS. Fail header-only analytics 200, records IDOR 200, leaderboard 200, header mark past 401. Fail F-002 student records 200. Do not invent cookies. Do not clear-all. |

Already closed (do not re-fix): faculty `instructorRequest`; student `rewards-api` `request()` → `studentAuthenticatedRequest`; score studentId bind; FacultyAttendanceScreen refresh/load errors; student `AttendanceScreen.load()` errors.

## Local repairs (source only — production unpatched)

Verified by re-reading files after the fix agent:

- AT1: `requireInstructorAttendanceAccess` uses `requireInstructorSession`; no `x-admin-id` bypass
- AT2: records GET binds the student and queries `bound.studentDbId`
- AT3: leaderboard binds; foreign section 403 via course/section variants
- AT4: mark + manual-request use bound db id
- AT5: streaks no longer skip bind on instructor header
- AT6: clear-all requires instructor session + section ownership
- AT7: score section roster uses `requireInstructorSession`
- AT8: audit script fails header-only analytics/records-IDOR/leaderboard/mark 200/400
- Contract: `npx tsx --test lib/instructor-attendance-auth.contract.test.ts` 2/2

Live header-only analytics and `records?studentId=351` + `x-student-id:722` are still **200** until v0 deploy. Status remains BLOCKED.

---

## Required Before Ship

1. AT1–AT3 in source, then deploy v0.
2. AT4–AT6 bind writes.
3. Honest `audit:attendance-production` (AT8).
4. Re-probe: header-only analytics and `records?studentId=351` with `x-student-id:722` must not be 200.

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 86 |
| UI | 80 |
| Buttons | 78 |
| API | 32 |
| CRUD | 58 |
| Authentication | 22 |
| Authorization | 18 |
| Student Isolation | 10 |
| Course Isolation | 28 |
| Membership | 80 |
| Production Configuration | 90 |
| Data Integrity | 40 |
| Security | 16 |
| Assessment Security | n/a |
| Cora Security | n/a |
| Error Handling | 78 |
| Mobile UX | 76 |
| Performance | 76 |
| Accessibility | 68 |
| Testing | 34 |

**Overall Module Score:** 41/100  

**Final Status:** BLOCKED BY SECURITY / DATA ISSUE  

**Audited at:** 2026-08-18T04:05:00.000Z
