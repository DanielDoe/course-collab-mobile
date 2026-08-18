# Calendar — Student Mobile Production Audit

```
MODULE: Calendar
STUDENT ROUTE: /module/calendar
NAVIGATION GROUP: Course Info. student-nav id calendar, label Calendar, icon calendar-number-outline. No minTier / locked.
FACULTY ROUTE: none. faculty-nav has no Calendar item. Academic Terms and Schedule Adjustment are sibling modules, not this surface.
REGISTRY ENTRY: student registry calendar → CalendarModuleScreen → CalendarScreen. faculty-registry: no calendar entry.
PRIMARY SCREEN: expo/src/components/course-info/CalendarScreen.tsx
RELATED SCREENS:
  - CalendarMonthGrid.tsx
  - ClassScheduleCard.tsx
  - Cora confirm personalCalendar.createEvents (student-owned sessions)
SUBROUTES: none under /module/calendar
API ROUTES (student):
  GET/POST/PUT/DELETE /api/calendar/events
  GET /api/calendar/class-schedule?studentId=&startDate=&endDate=
  POST /api/calendar/import-syllabus-deadlines
  POST /api/calendar/study-plan
  GET/POST/PUT /api/calendar/goals
API ROUTES (faculty Expo): none dedicated. Faculty syllabus publish + schedule-adjustment makeup/cancel feed class-schedule.
SERVICES: student-api.ts getCalendarEvents / getClassSchedule; course-info-api.ts; expo/src/lib/calendar/*
DATABASE MODELS: calendar_events, study_goals, ai_study_plans, course_schedule_versions, course_makeup_meetings, attendance_sessions (cancelled), syllabus
MEMBERSHIP: Unlocked. Intended.
CORA INTEGRATION: get_calendar_events, propose_calendar_study_sessions, propose_study_plan. Confirm uses session studentDbId. Live Cora UNVERIFIED.
FACULTY DEPENDENCY: Published syllabus meeting times + schedule-adjustment versions/makeups/cancels → student class meetings. No faculty event CRUD in Expo.
ADMIN DEPENDENCY: none
WEB DEPENDENCY: /student/dashboard-v2/calendar (empty copy: add events on web)
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Calendar**. Scope is Faculty Expo/mobile plus required backend and student Calendar downstream. Faculty Expo has **no Calendar module**; the faculty effect is syllabus + schedule-adjustment → class meetings. Personal `calendar_events` are a student-owned API with no instructor gate.

Execution: production HTTPS with Alex ECE `910000001` / db `722`, Jordan `910000002` / db `723`, faculty `mchen` / instructor `15`, course `16`. Simulator: **UNVERIFIED**. Created disposable events **288**, **289**, **290** titled `AUDIT-DELETE*` via unauthenticated POST; all deleted in the same session. Did **not** run study-plan with both `studentId` and `examDate` (would write many sessions + call OpenAI). Did **not** insert live study_goals.

No prior faculty Calendar READY report (module does not exist in faculty-nav).

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **44/100**  
Blockers: 0  
Critical: 3  
High: 3  
Medium: 1  
Low: 2

Student Calendar is a month agenda: class meetings from the published syllabus, plus personal `calendar_events`. Class-schedule and import-syllabus-deadlines are **session-bound** (unauth/header **401**; Alex cookie **200** 39 ECE meetings; Alex+Jordan header **403**). Faculty cookie cannot call class-schedule (**401**). Faculty → student class meetings **work**.

**Personal events are an open API.** Unauthenticated `GET /api/calendar/events?studentId=722` **200**. Unauthenticated POST created event **288** on Alex and it appeared on a later unauth GET. Jordan’s cookie read Alex’s calendar and saw event **289**. Unauth PUT/DELETE return **200** with no owner check. Goals GET is the same shape (**200** empty). Study-plan POST with empty body is **400**, not 401.

The Expo client sends cookies (`studentRequest` + `requireStudentSessionProof`). The events/goals/study-plan handlers never look at the session.

---

## Architecture

Student Drawer "Calendar"
→ `/module/calendar`
→ `CalendarScreen` + `courseInfoApi` / `studentApi`
→ GET `/api/calendar/events` + GET `/api/calendar/class-schedule`

Faculty Drawer: no Calendar
→ Syllabus publish / Schedule Adjustment
→ class-schedule reads syllabus + `course_schedule_versions` + makeups + cancelled attendance

Production
→ class-schedule / import-syllabus: `requireStudentIdParamMatchesCaller`
→ events / goals / study-plan: **no auth helper**

---

## Files Inspected

| Area | Path |
|------|------|
| Student hub | `CalendarScreen.tsx`, `CalendarMonthGrid.tsx`, `ClassScheduleCard.tsx` |
| Client | `student-api.ts` L852–874, `course-info-api.ts` |
| Backend | `app/api/calendar/events/route.ts`, `class-schedule/route.ts`, `import-syllabus-deadlines/route.ts`, `study-plan/route.ts`, `goals/route.ts` |
| Auth | `lib/student-api-auth.ts` (`requireBoundStudentCaller` exists; events do not call it) |
| Cora | `create-student-calendar-events.ts`, confirm-action `personalCalendar.createEvents` |
| Nav | `student-nav.ts` L109; `faculty-nav.ts` (no calendar) |

---

## Navigation & Routing

**Status:** PASS

Student Course Info → `/module/calendar` → `CalendarModuleScreen`. Faculty has no Calendar id (Academic Terms is a different module). Deep link is the module id. Missing-course: session hook returns null and load no-ops.

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app`  
Development URLs: none in calendar clients  
Mock dependencies: none

---

## Screens

Student Calendar ACTIVE (code + cookie class-schedule 200). Sim **UNVERIFIED**.  
No faculty Calendar screen.

---

## Components

| Component | Class |
|-----------|-------|
| Month grid + agenda pills | ACTIVE |
| ClassScheduleCard (reminders, native/Google/Outlook export) | ACTIVE (device export **UNVERIFIED** on sim) |
| Student event create/edit form | DEAD / not shipped (empty copy points to web) |
| Cora calendar tools | PLACEHOLDER live |

No module search (none required).

---

## Buttons

| Control | Location | Handler | Backend | Actual | Status |
|---------|----------|---------|---------|--------|--------|
| Prev/next month, Today | Grid | local month state | GET events + schedule | cookie schedule 200 | PASS (read) |
| Agenda All / Classes / Events | Pills | local filter | none | local | PASS |
| Reminder toggle / 15/30/60 | Card | local prefs + notifications | none | UNVERIFIED sim | UNVERIFIED |
| Add to Apple/device calendar | Card | `addClassScheduleToNativeCalendar` | none | UNVERIFIED sim | UNVERIFIED |
| Google / Outlook | Card | `Linking.openURL` | none | UNVERIFIED sim | UNVERIFIED |
| Faculty Calendar CRUD | — | — | — | no screen | N/A |

---

## Menus / Action Sheets

None on the student Calendar screen.

---

## Modals

None.

---

## Forms

No create/edit form on mobile. Web/Cora/open POST can still write `calendar_events`.

---

## API Routes

| Method | Route | Caller | Auth | Status |
|--------|-------|--------|------|--------|
| GET | `/api/calendar/events?studentId=722` unauth | anyone | **200** n=0 then n=1 after plant | FAIL (CAL1) |
| GET | same header-only | anyone | **200** | FAIL (CAL1) |
| GET | Jordan cookie + `studentId=722` | Jordan | **200** saw Alex event **289** | FAIL (CAL1) |
| GET | Jordan cookie-only, no header, `studentId=722` | Jordan | **200** n=2 | FAIL (CAL1) |
| GET | Alex cookie + Jordan header | Alex | **200** (session ignored) | FAIL (CAL1) |
| GET | faculty cookie + Alex id | faculty | **200** | FAIL (CAL1) |
| POST | `/api/calendar/events` unauth empty | anyone | **400** handler | FAIL (CAL2) |
| POST | unauth create AUDIT-DELETE | anyone | **200** ids **288/289/290** | FAIL (CAL2) |
| PUT | unauth `{eventId:999999999}` | anyone | **200** success | FAIL (CAL3) |
| DELETE | unauth `eventId=999999999` | anyone | **200** deleted | FAIL (CAL3) |
| DELETE | unauth created 288/289/290 | anyone | **200** gone | FAIL (CAL3) |
| GET | class-schedule unauth / header | anyone | **401** | PASS |
| GET | class-schedule Alex cookie | student | **200** hasSchedule 39 meetings ECE | PASS |
| GET | class-schedule Alex cookie-only | student | **200** | PASS |
| GET | class-schedule Alex + Jordan header | student | **403** | PASS |
| GET | class-schedule faculty cookie | faculty | **401** | PASS |
| POST | import-syllabus unauth / header | anyone | **401** | PASS |
| GET | `/api/calendar/goals?studentId=722` unauth | anyone | **200** n=0 | FAIL (CAL5) |
| POST | goals empty unauth | anyone | **400** | FAIL (CAL5) |
| PUT | goals fake id unauth | anyone | **200** | FAIL (CAL5) |
| POST | study-plan `{}` unauth | anyone | **400** not 401 | FAIL (CAL4) |

---

## CRUD

| Operation | Executed? | Status |
|-----------|-----------|--------|
| Read class meetings | Yes | PASS (session) |
| Read personal events | Yes | FAIL (no session) |
| Create personal event | Yes unauth 288–290 | FAIL |
| Update event | Unauth fake 200 | FAIL |
| Delete event | Yes unauth cleanup | FAIL |
| Faculty create class meeting via syllabus | Already published | PASS downstream |
| Study-plan generate | Empty-body only | FAIL auth (write not executed) |

---

## Authentication

**Status:** PASS on class-schedule and import-syllabus. FAIL on events, goals, study-plan.

Cookie is ignored on events. Header-only is enough for GET/POST. Unauth PUT/DELETE run.

---

## Student Authorization

Student cannot call faculty-only surfaces here. Student **can** read and write any `studentId` calendar. Mobile has no create UI; the API does.

---

## Cross-Student Isolation

Class-schedule: **PASS** (403 spoof).  
Events: **FAIL**. Planted **289** on 722; Jordan cookie GET `studentId=722` returned it.

---

## Course / Section Isolation

Class-schedule uses `resolveStudentCourseContextByDbId` after session bind. Alex received ECE 2202 Review Demo at UH Katy, not ELEG. PASS for that path. Events are student-owned (course N/A once identity is bound).

---

## Membership Enforcement

Unlocked. PASS (intended).

---

## Security

Open personal calendar CRUD is CRITICAL. Class meetings are closed.

---

## Assessment Security

N/A (no answer keys). Study-plan reads `ai_tutor_conversations` and mastery for the claimed `studentId` before generating — unauth with both fields would leak topics. Not executed. CAL4.

---

## Cora Security

Confirm path uses `input.session.claims.studentDbId` + `authorizeCreatePersonalCalendar`. Live tool **UNVERIFIED**. Registry allows create with confirm. PARTIAL.

---

## Database Integrity

Unauth INSERT 288/289/290 and DELETE succeeded. Rows existed on GET then disappeared. Integrity of the open write path **PASS** (the vulnerability). Owner checks **FAIL**.

---

## Files / Documents

ICS / native calendar export is client-side. **UNVERIFIED** on sim.

---

## Notifications

`useNotificationModuleRefresh("calendar")`. Local class reminders. Cron `calendar-reminders` exists. Push **UNVERIFIED**.

---

## Mobile UX

Native grouped canvas, month grid, class card. No dock search (no search). Sim **UNVERIFIED**.

---

## Theme

`NATIVE` + calendar color tokens. Status uses icon + type label. Sim **UNVERIFIED**.

---

## Accessibility

Agenda rows are not pressable buttons (display only). Month controls **UNVERIFIED** on sim.

---

## Errors / Loading / Empty States

Loading spinner, error banner, empty “Nothing scheduled” / “Add events on web”. Present.

---

## Performance

Class-schedule returned 39 expanded meetings for a 90-day window. Acceptable.

---

## Web / Mobile Integration

Mobile is read-only; web can POST events. After a server bind, web must send the session. Contract of fields (`title`, `event_type`, `start_time`) matches.

---

## Faculty → Student Integration

**Executed for class meetings.** Published ECE syllabus → Alex class-schedule `hasSchedule: true`, Tue/Wed/Thu 10:00–12:00, 39 events. Faculty cookie cannot read that route (401). Personal events have no faculty Expo editor; faculty cookie can still hit the open events API.

---

## Tests

No `audit:calendar-production`. No Expo/v0 calendar auth contract tests.

---

## End-to-End Results

| Step | Result |
|------|--------|
| Unauth / header-only class-schedule | 401 |
| Alex cookie class-schedule | 200, 39 ECE meetings |
| Cross-student class-schedule | 403 |
| Unauth events GET/POST/PUT/DELETE | 200 write/read/delete |
| Jordan reads Alex planted event | 200 |
| Simulator | UNVERIFIED |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Missing session events | **200** |
| Header-only events | **200** |
| Cookie + foreign studentId events | **200** (Jordan read 289) |
| Unauth create on 722 | **200** 288/289/290 |
| Unauth delete | **200** |
| Faculty cookie events | **200** |
| Missing session class-schedule | 401 |
| Header-only class-schedule / import | 401 |
| Faculty cookie class-schedule | 401 |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| CAL1 | CRITICAL | Auth / isolation | `GET /api/calendar/events` has no session. Query `studentId` is the identity. | Unauth 200; Jordan cookie + `studentId=722` **200** and saw planted **289**. Faculty cookie 200. | `app/api/calendar/events/route.ts` GET | `requireBoundStudentCaller` then query `auth.studentDbId` only. |
| CAL2 | CRITICAL | Auth / integrity | `POST /api/calendar/events` writes for any `studentId`. | Unauth **200** ids 288, 289, 290. Header-only POST **200** 290. | same POST | Bind session first. Insert `auth.studentDbId`. 401 unauth. 403 spoof. |
| CAL3 | CRITICAL | Auth / IDOR | PUT/DELETE take `eventId` only. No owner. Unauth **200**. | PUT 999999999 **200**; DELETE 999999999 **200**; DELETE 288–290 **200**. | same PUT/DELETE | `requireCallerStudentDbId` then 404 unless `calendar_events.student_id` matches. |
| CAL4 | HIGH | Auth / privacy | `POST /api/calendar/study-plan` has no auth; reads conversations + writes events. | Unauth `{}` **400** (handler). Full generate not run. | `app/api/calendar/study-plan/route.ts` | `requireBoundStudentCaller` before any SQL/OpenAI. Never 400-as-auth. |
| CAL5 | HIGH | Auth | Goals GET/POST/PUT have no session. | Unauth GET 722 **200**; POST `{}` **400**; PUT fake **200**. | `app/api/calendar/goals/route.ts` | Same bind. PUT 404 unless owner. |
| CAL6 | HIGH | Tests | No honest production script. Client cookies are ignored by events. | No `audit:calendar-production`. | `expo/scripts` | Script: fail 200/400/404 on unauth/header-only events/goals/study-plan. Cookie 403 spoof. AUDIT-DELETE + finally. Never full study-plan generate. |
| CAL7 | MEDIUM | Faculty surface | Faculty Expo has no Calendar module; faculty cookie still reads/writes the open student events API. | faculty-nav no calendar; faculty GET events 200. | events route | Close the API (CAL1–CAL3). Do not invent a faculty Calendar screen. |
| CAL8 | LOW | Cora | Registry + confirm session path; live UNVERIFIED. | confirm-action L493–538 | — | Keep confirm; do not add unauth tools. |
| CAL9 | LOW | Testing | No contract test that events/goals/study-plan call `requireBoundStudentCaller`. | Local: 7/7 v0 + 2/2 Expo after repair. | tests | Source contracts added. Production still open. |

---

## Local repairs (source verified — production unpatched)

Parent re-read every changed file. Did not take the fixer at its word. Tests re-run by parent:

```
cd v0-coursecollabv3 && npx tsx --test lib/calendar-auth.contract.test.ts
→ 7 pass / 0 fail

cd expo && npx tsx --test src/lib/calendar-auth.contract.test.ts
→ 2 pass / 0 fail
```

| ID | Local source | Production |
|----|--------------|------------|
| CAL1 | GET events: `requireBoundStudentCaller` then `WHERE student_id = auth.studentDbId` | Unauth GET still 200 |
| CAL2 | POST events: bind first; INSERT `auth.studentDbId` | Unauth POST still 200 |
| CAL3 | PUT/DELETE: `requireCallerStudentDbId` then 404 unless owner; DELETE scoped to caller | Unauth PUT/DELETE still 200 |
| CAL4 | study-plan bind before conversations SQL / OpenAI; inserts `auth.studentDbId` | Unauth `{}` still 400 |
| CAL5 | goals GET/POST bind; PUT owner 404 | Unauth GET still 200 |
| CAL6 | `audit:calendar-production` — 200/404 fail; no study-plan generate; no `pending deploy` | Script will FAIL until v0 deploy |
| CAL7 | Closed by CAL1–CAL3 (no faculty Calendar screen added) | Faculty cookie still reads events |
| CAL9 | Contract tests as above | n/a |

Do **not** mark READY. Deploy v0, then re-run `npm run audit:calendar-production`.

---

## Required Before Ship

1. Deploy v0 Calendar events/goals/study-plan session bind (CAL1–CAL5).
2. Re-probe: unauth/header-only events GET/POST/PUT/DELETE must **401**; Jordan must not read Alex events.
3. `audit:calendar-production` must pass without treating 200 as deploy-pending.

Class-schedule 401s do not make this module ready while events stay open.

---

## Future Improvements

Mobile create/edit after the API is bound. Simulator pass on native calendar export.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 88 |
| UI | 78 |
| Buttons | 72 |
| API | 28 |
| CRUD | 22 |
| Authentication | 24 |
| Authorization | 20 |
| Student Isolation | 18 |
| Course Isolation | 82 |
| Membership | 88 |
| Production Configuration | 90 |
| Data Integrity | 25 |
| Security | 12 |
| Assessment Security | 70 |
| Cora Security | 55 |
| Error Handling | 70 |
| Mobile UX | 74 |
| Performance | 78 |
| Accessibility | 70 |
| Testing | 15 |

OVERALL SCORE: 44/100

FINAL STATUS: BLOCKED BY SECURITY / DATA ISSUE

Audited at: 2026-08-18T04:00:00.000Z

Commit: `dba7f46`

Dependencies recorded: student-api, course-info-api, CalendarScreen, ClassScheduleCard, requireBoundStudentCaller, api/calendar/events, api/calendar/class-schedule, api/calendar/goals, api/calendar/study-plan, api/calendar/import-syllabus-deadlines
