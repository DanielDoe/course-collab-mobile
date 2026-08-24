# TestFlight Feedback Fix Log

**Purpose:** a running record of tester-reported issues that have already been
fixed, so a later session does not re-investigate or re-patch them.

**How to use this before starting new feedback work**

1. Read the tables below and match each new tester report against the
   **Symptom** column — testers usually describe the same bug in similar words.
2. If a match is `Fixed`, check whether the listed commit is in the build the
   tester used. A fix that has landed but has not shipped will keep coming back
   in feedback; that is not a new bug.
3. If a match is `By design` or `Not reproducible`, do not re-open it without
   new evidence. The reasoning is recorded so it can be argued with, not
   rediscovered.
4. Only items under **Still open** need work.

**Repos**

| Name | Path | Role |
|------|------|------|
| Mobile | `course-collab-mobile` (this repo, app code in `expo/`) | Expo / React Native client |
| Backend | `v0-coursecollabv3` | Next.js API + web app |

---

## Round 2 — TestFlight screenshot feedback (Aug 24, 2026)

Source: App Store Connect → TestFlight → Screenshot feedback, build 1.0.0 (39).
24 items triaged.

### Fixed in this round

Mobile changes landed in `106e2c8`; backend changes are noted per row.

| # | Symptom as reported | Root cause | Fix location |
|---|---------------------|------------|--------------|
| 1 | Calendar "Study" button does nothing | Routed to `/module/practice`, which ignores `?topic=` | `expo/src/lib/calendar/study-session-navigation.ts` → `/practice/topic`; covered by `study-session-navigation.test.ts` |
| 2 | Searching lectures with no results leaves no way back | `ModuleScreen`'s `empty` prop replaces children, unmounting the search box | `expo/src/components/lectures/LecturesScreen.tsx` keeps the toolbar and shows an inline empty state with a "Clear search" button; `FacultyEmptyState` gained an optional `action` slot |
| 3 | Downloading slides gives no feedback | Tools sheet closes before the download starts, so it could not host a spinner | `expo/src/components/lectures/StudentLectureViewerScreen.tsx` owns a "Preparing slides…" overlay plus failure alerts |
| 4 | Cora Code cards clipped under the status bar | `CoraOverlayShell` added no top inset and none of its tabs did either | `expo/src/components/cora/CoraOverlayShell.tsx` applies `insets.top`, fixing all four overlay tabs |
| 5 | Notification list scrolls through the header | Whole sheet was one scroll view, so the header scrolled away | `expo/src/components/shell/NotificationsSheet.tsx` uses `scrollable={false}` and scrolls only the list |
| 6 | Instructor opening a notification lands on student screens | Push handling always used the student link resolver | `expo/src/context/NotificationProvider.tsx` branches on `session.portal` and uses `facultyNativeRouteFromLink` for faculty |
| 7 | CodeBench practice panel reappears after dismissing it | `runTool` is async and still called `setPanel("practice")` after dismissal | `expo/src/components/codebench/CodebenchIdeScreen.tsx` guards every tool result with a `toolRunEpoch` ref, bumped by both dismissal paths |
| 8 | "Practice problem" panel opens empty | Assessment-integrity refusal was treated as the problem statement | Same file: refusals now surface as a clear message; response type extended in `expo/src/lib/codebench-api.ts` |
| 9 | "Code Practice Session" shows an error screen | One failed progress endpoint replaced the whole hub | `expo/src/components/codebench/CodebenchScreen.tsx` shows an inline banner and keeps the hub usable |
| 10 | Quick Actions and Announcements are too low on the dashboard | Section order hardcoded with them last | `expo/app/(app)/dashboard.tsx` reordered to KPIs → Quick Actions → Announcements → charts |
| 11 | Recommendation deadline: "Deadline is required" | Deadline started empty and the picker only emits a value once all three wheels are set | `expo/src/components/faculty/FacultyRecommendationCreateModal.tsx` prefills 30 days out and names the missing fields |
| 12 | No way to mark a lecture as completed (feature request) | Completion was derived only from viewed slides | Backend `a53e604c` adds `mark_completed`; mobile toggle in `StudentLectureToolsSheet.tsx` + `StudentLectureViewerScreen.tsx`, client in `student-api.ts` (`setLectureCompleted`) |

### Fixed earlier but not yet in a build

These were already patched before build 39 shipped (also in `106e2c8`), so
testers on 39 and earlier still see them. **Do not re-fix.**

| Symptom | Fix location |
|---------|--------------|
| "Need help?" on the student login screen does nothing | `expo/src/components/login/StudentLoginPanel.tsx` — now a `Pressable` opening `mailto:support@course-collab.com` |
| Name still shows the old value after updating the profile | `expo/src/components/settings/SettingsScreen.tsx` derives from `fullName` and calls `updateSession()` after save |
| "Continue" button text is hard to read | `expo/src/components/login/LoginButton.tsx` — disabled state no longer dims the whole button |
| Announcement opens to a blank screen (build 38) | `?open=` parameter mapping, shipped in mobile `beac652` |

### By design — do not "fix"

| Report | Why it stays |
|--------|--------------|
| Cora refuses to generate a CodeBench practice problem | `generate_similar_practice` is deliberately excluded from `restrictedCaps()` while an assessment attempt is open (`lib/cora/security/assessment-integrity.ts`). Bypassing the gate would weaken integrity. Item 8 above fixed only the confusing UI. |

### Not reproducible

| Report | Evidence |
|--------|----------|
| CodeBench 500s attributed to a missing `practice_submissions` table | Queried the database directly on Aug 24, 2026: `practice_submissions`, `codebench_submissions`, `daily_challenge_submissions`, and `practice_session_configs` all exist. Item 9's mobile resilience fix still applies. |

### Still open

| Item | Blocker |
|------|---------|
| "Fix the padding here" | Needs the full-size screenshot; the screen cannot be identified from the thumbnail |
| Attendance streak widget still errors | Backend date fix is committed (`cf159fbc`) but needs deploying before testers see it clear |

---

## Round 1 — sample practice answer accuracy (Aug 2026)

Triggered by a Select All question on early procedural programming languages
that graded FORTRAN alone as fully correct.

### Content and grading

| Issue | Resolution |
|-------|------------|
| Select-all questions graded as wrong despite correct answers | Client-side bug, not a deploy gap. The mobile parser normalizes stripped `select_all` questions to `correct_answers: []`, and the old `??` fallback did not treat `[]` as absent, so the client regraded against an empty key set and overrode the server's correct verdict. Fixed in `expo/src/lib/lecture-sample-practice-grading.ts` with a `?.length` guard; missing keys now render neutral instead of red. |
| Select-all stems and explanations were vague or contradictory | 22 explanations rewritten across 102 lecture instances and 66 question bank rows via `scripts/reword-select-all-explanations.ts` (backend repo). Four defective questions deliberately skipped. |
| ELEG answer keys semantically wrong | Multi-model review (six models, 2-of-3 majority) over 66 flagged questions. 16 confirmed correct as-is, 23 keys corrected, 11 flagged as needing redesign rather than a key flip. |
| Quiz copies held stale answer keys | `scripts/audit-quiz-answer-key-drift.ts` matches by option **text**, not letter, so shuffled options stay correct. 54 quiz copies synced; no student answers were affected. |
| ~110 choice questions rendered with no options | Backfilled 77 from linked bank questions. 30 were `code_output` (free-text by design, correctly optionless). 9 remain blocked because the bank row has 6 options and `quiz_questions` only has 5 columns — a schema limit, not a data bug. |
| Option E never reached students | Added `option_e` through the legacy take-quiz route, the user-quiz UI, CSV import/export for both admin and instructor, and the select-all audit tooling. The main student quiz flow already handled it. |
| `randomizeOptions` could corrupt the correct answer | Fixed the remap in `lib/assessment-core/render.ts` and verified over 6000 trials. Dormant code with no callers. |

### Server errors cleared from `system_logs`

All in the backend repo, mostly commit `cf159fbc`.

| Error | Fix |
|-------|-----|
| `SELECT DISTINCT, ORDER BY expressions must appear in select list` on student login | `lib/student-university-auth.ts` rewritten to `GROUP BY` with a `MIN` aggregate |
| `relation "practice_session_configs" does not exist` | Added `migrations/add-practice-session-configs.sql` |
| `invalid input syntax for type date: "Tue Aug 25"` (477 occurrences) | `String(Date).slice(0,10)` produced garbage; added `toDateOnly()` in `lib/attendance-enrollment-scope.ts` and cast `as_of_date::text` in the progress-review route |
| Cora student context silently empty (4,165 occurrences) | Wrong table names in `lib/cora/fetch-student-context.ts`: `flashcards` → `flashcard_cards`, `digital_notes` → `student_digital_notes`, and a non-existent `status` column removed |
| Instructor misconception insight never rendered (275) | Subquery alias fixed in `app/api/instructor/cora/insights/route.ts` |
| Cora institution and section scope always null (438) | `institution_id` → `university_id`, `course_sections` → `sessions`, in `lib/cora/security/cora-session.ts` and `fetch-faculty-context.ts` |
| Membership payment method lookup failed (101) | Non-existent `payment_method` column removed from the `donations` query |

### Security

| Issue | Fix |
|-------|-----|
| Any authenticated student could POST arbitrary file contents to `/api/cora/github/submit-fix` and open a pull request against the product repo, which was live in production | Both `submit-fix` and `status` now require an admin caller. Added a `platform_security_internals` hard-deny so Cora refuses questions about CourseCollab's own source, secrets, or vulnerabilities while still answering security coursework. Mobile refuses student submissions client-side. Backend commit `d885b2e1`, tested in `lib/cora/agent/clearances.platform-internals.test.ts`. |

---

## Notes for the next session

- `106e2c8` also carries the React Query migration, the `cora-security` modules,
  the student signup flow, and new Maestro flows. Several of the fixed files
  import modules introduced there, so these fixes cannot be cherry-picked into a
  build without that work.
- `cd expo && npm test` is the fast check. The repo carries pre-existing
  TypeScript errors unrelated to these fixes; compare counts before and after a
  change rather than expecting zero.
