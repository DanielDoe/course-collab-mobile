# Student App — Color Hunt Palettes (Web Parity Guide)

Reference for aligning the **web student dashboard** with the Expo mobile app’s Color Hunt–based accents.

**Source of truth:** `expo/src/lib/*-theme.ts` (see [Source file index](#source-file-index)).  
**Last updated:** Aug 2026 — full student nav audit including Course Info, Settings, Support, Membership shell badge.

---

## Nav group → theme file (quick map)

| Nav group / area | Primary theme file | Notes |
|------------------|-------------------|--------|
| Dashboard | `dashboard-theme.ts` | Fixed KPI + engagement swatches |
| Learning Center | `solid-list-thumb.ts` + module-specific (`lecture-list`, `cora-*`, `codebench-badge`, `analytics-more`, `flashcard-difficulty`) | Most lists use thumb cycle |
| Assessments | `grades-theme.ts`, `assessment-report-theme.ts`, `solid-list-thumb.ts` | Grades warm + report semantics |
| Collaboration | `collaboration-list-theme.ts`, `playground-list-theme.ts`, `leaderboard-podium-theme.ts` | Status green/orange/red |
| Performance & Rewards | `attendance-overview-theme.ts`, `trade-center-theme.ts`, `leaderboard-podium-theme.ts` | Neutral card bodies |
| Course Info | `course-info-color-theme.ts` | Indigo primary; orange CTAs |
| Settings | `support-color-theme.ts` → `SETTINGS_ROW_THUMBS` | Per-row solid tiles |
| Support (Help, forms) | `support-color-theme.ts` | Orange submit CTAs |
| Membership / Plans | `membership-plans.ts`, `membership-plan-theme.ts` | Fixed tiers; no appearance override |
| Auth / Login | `login-color-theme.ts`, `login-theme.ts` | Color Hunt; not appearance accent |
| Shell (drawer badge) | `membership-plan-theme.ts` → `membershipTierSolidBadge()` | Solid tier pills |

---

## Design rules (apply on web)

1. **Keep card/list containers neutral** — use grouped background, standard borders, and theme surface colors. Do **not** tint entire card bodies with Color Hunt unless noted (e.g. engagement KPI tiles, report section bands).
2. **Apply Color Hunt to accents only:** icon thumb tiles, progress bar fills, CTAs, status chips, podium medals, hero gradients (where used), and semantic highlights.
3. **Never color alone** — pair every status color with an icon and/or label.
4. **Solid list thumb tiles:**
   - **List rows:** 56×56 px, radius 14 — white (or dark ink) icon on solid fill (`SolidListThumbTile` size `"list"`).
   - **Compact** (settings rows, section headers, drawer links): 30–36 px, radius 8–10 (`size="compact"`).
   - Rotate by list index via `SOLID_THUMB_CYCLE` unless a module assigns a fixed swatch.
5. **Progress tracks:** `hexToRgba(accent, 0.16)` on light mode; `rgba(255,255,255,0.12)` on dark mode.
6. **Primary form CTAs** (submit, send, office hours, course forms): **`#FB6C00`** (`GRADES_WARM.orange` / `COURSE_INFO_ACTION` / `SUPPORT_ACTION`) with white text — not appearance theme accent.
7. **Module themes override appearance** for Course Info, Support, and Membership — do not bind these to the user’s Titanium/slate accent.

---

## Core palettes (Color Hunt)

### Warm — Orange · Yellow · Amber · Pink

| Token | Hex | Usage |
|-------|-----|-------|
| `orange` | `#FF6A1C` | CTAs, in-progress, streaks, warnings |
| `yellow` | `#FFDA62` | Easy difficulty, upcoming items |
| `amber` | `#FFAE56` | Medium difficulty, badges |
| `pink` | `#F5788B` | Hard accents, donate actions |
| `yellowLight` | `#FFE999` | Card orbs / soft highlights |
| `amberLight` | `#FFD099` | Card orbs / soft highlights |
| `orangeDeep` | `#E05510` | Secondary ink, today labels |
| `pinkDeep` | `#D86176` | Donation / deep pink text |
| `ink` | `#4A2E0A` | Text on yellow/gold fills |

**Palette URL:** [colorhunt.co/palette/ff6a1cffda62ffae56f5788b](https://colorhunt.co/palette/ff6a1cffda62ffae56f5788b)  
**Source:** `expo/src/lib/flashcard-difficulty-theme.ts` → `COLOR_HUNT`

### Cool — Gold · Indigo · Cyan · Sky

| Token | Hex | Usage |
|-------|-----|-------|
| `gold` | `#FFC349` | 1st place, attendance streak, badges |
| `indigo` | `#525EA7` | Primary cool accent, quizzes, Cora |
| `cyan` | `#5FACD3` | Secondary cool, homework, playground |
| `sky` | `#97DDE9` | Engagement, light cool fills |

**Palette URL:** [colorhunt.co/palette/ffc349525ea75facd397dde9](https://colorhunt.co/palette/ffc349525ea75facd397dde9)  
**Source:** `expo/src/lib/codebench-badge-theme.ts` → `COLOR_HUNT_COOL`

### Grades / Attendance warm — Red · Orange · Gold · Cream

| Token | Hex | Usage |
|-------|-----|-------|
| `red` | `#E73F1E` | Finals, missed, low scores, goal KPI |
| `orange` | `#FB6C00` | Midterms, pending, primary actions |
| `gold` | `#F9B637` | High scores, quiz events, streak KPI |
| `cream` | `#FFDD9C` | Soft neutral wash, classroom category |
| `ink` | `#5C2E12` | Text on gold/cream |
| `inkMuted` | `#8B5A2B` | Muted warm text |

**Palette URL:** [colorhunt.co/palette/e73f1efb6c00f9b637ffdd9c](https://colorhunt.co/palette/e73f1efb6c00f9b637ffdd9c)  
**Source:** `expo/src/lib/grades-theme.ts` → `GRADES_WARM`  
**Also used by:** Attendance overview (`attendance-overview-theme.ts` aliases `GRADES_WARM`)

### Report / status semantics

| Token | Hex | Usage |
|-------|-----|-------|
| `correct` / `excellent` | `#22C55E` | Correct, approved, completed |
| `missed` | `#EF4444` | Incorrect / missed |
| `missedDeep` | `#E73F1E` | Missed border / fair band |
| `pending` / `good` | `#FB6C00` | Pending review, 70–89% band |
| `fair` | `#E73F1E` | 50–69% band |
| `poor` | `#DC2626` | Below 50% |
| `skipped` | `#64748B` | Skipped / neutral badge |

**Source:** `expo/src/lib/assessment-report-theme.ts` → `REPORT_SOLID`

### Podium medals

| Rank | Hex | Token |
|------|-----|-------|
| 1st | `#FFC349` | `PODIUM_MEDAL.first` (gold) |
| 2nd | `#525EA7` | `PODIUM_MEDAL.second` (indigo) |
| 3rd | `#FF6A1C` | `PODIUM_MEDAL.third` (orange) |

**Hero gradient (light):** indigo → cyan → orange (`#525EA7` → `#5FACD3` → `#FF6A1C`)  
**Source:** `expo/src/lib/leaderboard-podium-theme.ts`

---

## Shared patterns

### Rotating list thumb cycle (`SOLID_THUMB_CYCLE`)

Used by most list modules when `SignatureListCard` receives an `index`. Cycle order:

| # | Fill | Icon |
|---|------|------|
| 0 | `#525EA7` indigo | `#FFFFFF` |
| 1 | `#FF6A1C` orange | `#FFFFFF` |
| 2 | `#5FACD3` cyan | `#FFFFFF` |
| 3 | `#F5788B` pink | `#FFFFFF` |
| 4 | `#FFC349` gold | `#4A2E0A` |
| 5 | `#FFAE56` amber | `#4A2E0A` |
| 6 | `#97DDE9` sky | `#1E3A5F` |
| 7 | `#FFDA62` yellow | `#4A2E0A` |

**Special thumbs:** locked `#636366`, empty `#8E8E93`, success `#34C759`  
**Source:** `expo/src/lib/solid-list-thumb.ts`

### Status accent semantics (collaboration + assessments)

| State | Color | Hex |
|-------|-------|-----|
| Approved / active / completed | Green | `#22C55E` |
| Pending / draft / in progress | Orange | `#FF6A1C` or `#FB6C00` |
| Rejected / missed | Red | `#EF4444` / `#E73F1E` |
| Lecture completed | Green | `#34C759` |
| Lecture in progress | Orange | `#FF6A1C` |

**Sources:** `collaboration-list-theme.ts`, `lecture-list-theme.ts`, `playground-list-theme.ts`

### Grade performance bands

| Score | Color |
|-------|-------|
| ≥ 90 | `#F9B637` gold |
| ≥ 80 | `#FB6C00` orange |
| ≥ 70 | `#F08800` |
| ≥ 60 | `#EF5018` |
| < 60 | `#E73F1E` red |

**Source:** `grades-theme.ts` → `gradePerformanceColor()`

---

## Module-by-module reference

Organized by student nav groups (`expo/src/constants/student-nav.ts`).

### Dashboard

| Element | Colors |
|---------|--------|
| KPI thumbs | Overall grade `#525EA7`, Quiz avg `#5FACD3`, Homework `#F5788B`, Attendance `#FFC349`, Missing work `#FF6A1C`, Classroom points `#FFAE56`, Upcoming `#FFDA62`, Engagement `#97DDE9` |
| Quick actions | Quizzes indigo, Grades pink, Homework cyan, Practice orange |
| Engagement cards (solid fill) | Points indigo, Streak orange, Credits pink, Attendance cyan |
| Insights | Warning orange `#FF6A1C`, Tip cyan `#5FACD3` |
| Announcement stripe | Rotates: indigo, orange, pink, cyan, amber |

**Source:** `expo/src/lib/dashboard-theme.ts`

---

### Learning Center

#### Lectures
- **List thumb:** `SOLID_THUMB_CYCLE` by index
- **Status:** completed `#34C759`, in progress `#FF6A1C`, available = thumb color, locked gray

**Source:** `lecture-list-theme.ts`

#### My Notes
| Note kind | Thumb fill | Icon |
|-----------|------------|------|
| Personal | Cycle by index | `#FFFFFF` |
| Shared | `#525EA7` indigo | `#FFFFFF` |
| Course | `#5FACD3` cyan | `#FFFFFF` |

**Source:** `note-list-utils.ts`

#### Flashcards
| Difficulty | Card fill | Badge text |
|------------|-----------|------------|
| Easy | `#FFDA62` yellow | `#4A2E0A` |
| Medium | `#FFAE56` amber | `#4A2E0A` |
| Hard | `#FF6A1C` orange | `#FFFFFF` |
| Very hard | `#F5788B` pink | `#FFFFFF` |
| Stack peek (back layers) | pink, orange, yellow | — |

**Source:** `flashcard-difficulty-theme.ts`

#### AI Notetaker
- No dedicated Color Hunt theme file; uses module accent from appearance theme.
- Match list patterns if adding thumbs: use `SOLID_THUMB_CYCLE`.

#### Practice Hub
- **Topic / session list thumbs:** `SOLID_THUMB_CYCLE` via `SignatureListCard` + `index`
- **Status accents:** module theme accent (`SN.accent`); completed `#22C55E` (via tokens.success)
- **Leaderboard list:** current user thumb `#525EA7`; others cycle
- **Leaderboard podium:** shared podium medals + hero gradient

**Sources:** `PracticeHubScreen.tsx`, `practice-leaderboard-utils.ts`, `leaderboard-podium-theme.ts`

#### Cora Assistant
| Area | Fixed swatches |
|------|----------------|
| Quick actions | explain `#525EA7`, walk circuit `#FF6A1C`, help code `#5FACD3`, prepare exam `#F5788B`, review homework `#FFAE56`, flashcards `#FFDA62`, summarize `#FFC349`, study plan `#97DDE9` |
| Activity KPIs | questions indigo, streak orange, mastered pink, progress cyan |
| Explore tabs | learn indigo, code cyan, insights pink, study plan orange |
| Credits | gold `#FFC349` |
| Learn tab tools | lectures indigo, practice orange, flashcards pink, summarize cyan |
| Solve tab | hero/import indigo, camera cyan, workspace pink; CTA `#525EA7` |
| Insights KPIs | questions indigo, streak orange, mastered pink, reasoning cyan |

**Sources:** `cora-home-theme.ts`, `cora-learn-theme.ts`, `cora-solve-theme.ts`, `cora-insights-theme.ts`

#### CodeBench IDE
| Element | Color |
|---------|-------|
| KPI streak | `#FF6A1C` orange |
| KPI badges | `#525EA7` indigo |
| KPI XP | `#5FACD3` cyan |
| Badge: loops master | indigo |
| Badge: bug hunter | orange |
| Badge: clean code | cyan |
| Badge: streak 3 | amber |
| Badge: streak 7 | gold |
| Badge: STL expert | pink |

**Source:** `codebench-badge-theme.ts`

#### Analytics & More
| Element | Color |
|---------|-------|
| KPI streak | orange |
| KPI badges | indigo |
| KPI subs | cyan |
| KPI rank | gold |
| KPI submissions | orange |
| KPI active days | indigo |
| XP bar fill | orange |
| Level accent | amber |
| List thumbs | IDE orange, evaluate cyan, practice pink, recommendation indigo, task yellow, streak orange/indigo |
| Calendar active day | cyan |

**Source:** `analytics-more-theme.ts`

---

### Assessments

#### Quizzes · Homework · Mid-Semester · Finals (list cards)
- **Thumb:** `SOLID_THUMB_CYCLE` by index (`AssessmentItemCard`)
- **Report / results:** see Report semantics below

#### History
- **Timeline dot:** thumb label color from cycle by index

**Source:** `AssessmentHistoryTimelineItem.tsx`

#### Grades
| Element | Colors |
|---------|--------|
| Hero gradient (light) | cream `#FFDD9C` wash → `#FFFBF3` → gold tint |
| Category thumbs | quiz indigo, homework cyan, midterm `#FB6C00`, final `#E73F1E`, project gold, attendance gold, classroom cream, engagement sky |
| Letter / score bands | See grade performance + letter map in `grades-theme.ts` |
| Compare above class | gold `#F9B637` |
| Compare below | red `#E73F1E` |
| Provisional | orange `#FB6C00` |

**Source:** `grades-theme.ts`, `GradeHeroCard.tsx`

#### Assessment report (results)
- **Section cards:** solid fill by performance band (green / orange / red)
- **Question status:** correct green, pending orange, missed red, skipped slate
- **Donut / bars:** same performance function as sections
- **Option rows:** selected+correct green; selected wrong red; revealed correct green wash

**Source:** `assessment-report-theme.ts`

---

### Collaboration

#### Forum Hub
- **Medal ranks 1–3:** podium gold / indigo / orange
- **List threads:** `SOLID_THUMB_CYCLE` (via shared list patterns)

**Source:** `ForumScreen.tsx`, `leaderboard-podium-theme.ts`

#### Messages
- No Color Hunt thumb theme; uses appearance accent.
- Send button: circular accent (Cora-style), not a palette-specific color.

#### Groups · Projects
- **List thumb:** `SOLID_THUMB_CYCLE`
- **Group status:** approved/active `#22C55E`, pending `#FF6A1C`, rejected `#EF4444`
- **Project status:** approved green, pending orange, rejected red

**Source:** `collaboration-list-theme.ts`, `GroupsScreen.tsx`, `ProjectsScreen.tsx`

#### Playground
| Element | Color |
|---------|-------|
| List thumb | Cycle by index |
| Game in progress | orange `#FF6A1C` |
| Game completed | green `#22C55E` |
| Join primary CTA | orange `#FF6A1C`, white text |
| Join secondary | orange 12% fill, 28% border, ink `#E05510` |
| Tier badge | gold 22% wash, icon `#E05510` |
| Leaderboard shortcut tile | indigo `#525EA7` |
| Leaderboard podium | Shared podium theme |

**Source:** `playground-list-theme.ts`, `PlaygroundScreen.tsx`

---

### Performance & Rewards

#### Classroom Points
- **Point / task / leaderboard lists:** `SOLID_THUMB_CYCLE` via `SignatureListCard` + `index`
- **Status:** approved uses rewards theme primary; pending `#d97706`
- **Leaderboard podium:** gold / indigo / orange + hero gradient

**Source:** `ClassroomPointsScreen.tsx`, `ClassroomPointsLeaderboardPodium.tsx`

#### Attendance
| Element | Color |
|---------|-------|
| Hero container | **Neutral** (grouped background) |
| Progress bar fill | Performance-based warm band (see grade performance) |
| Progress track | orange 16% (light) / white 12% (dark) |
| KPI: Points | fill `#FB6C00`, label orange |
| KPI: Best streak | fill `#F9B637`, ink `#5C2E12` |
| KPI: Next goal | fill `#E73F1E`, label red |
| Record list status | present `#16a34a`, absent `#dc2626` |
| Leaderboard podium | Shared podium theme |

**Source:** `attendance-overview-theme.ts`, `AttendanceOverviewHero.tsx`, `AttendanceScreen.tsx`

#### Trade Center
| Element | Color |
|---------|-------|
| Card containers | **Neutral** |
| Lifetime EC tile | icon gold `#F9B637`, value orange `#FB6C00` |
| Practice tile | orange `#FB6C00` |
| Playground tile | cyan `#5FACD3` |
| Reading tile | indigo `#525EA7` |
| Progress bars | Same as tile fill; track = fill @ 16% |
| Trade button | orange `#FB6C00` |
| Donate button | pink `#F5788B` |
| History: trade | orange |
| History: donation | pink `#F5788B`, value `#D86176` |

**Source:** `trade-center-theme.ts`, `TradeCenterScreen.tsx`

---

### Course Info

#### Announcements
- **List thumb:** `SOLID_THUMB_CYCLE` by index

**Source:** `AnnouncementsScreen.tsx`

#### Calendar
| Element | Color |
|---------|-------|
| Schedule header | indigo `#525EA7` |
| Month header | cyan `#5FACD3` |
| Primary sync/action | orange `#FB6C00` |
| Secondary action | cyan 14% fill, 32% border, indigo text |
| Class dot | orange |
| Event dot | pink `#F5788B` |
| Selected day | orange 14% fill, orange text |
| Today border | gold 65%; text `#E05510` |
| Reminder chip (active) | orange |
| Agenda date | indigo |

**Event type colors:**

| Type | Hex |
|------|-----|
| Class meeting | `#FB6C00` |
| Study session | `#5FACD3` |
| Quiz | `#F9B637` |
| Exam | `#E73F1E` |
| Assignment | `#525EA7` |
| Office hours | `#F5788B` |
| Group study | `#FFC349` |
| AI reminder | `#FFAE56` |

**Source:** `calendar/calendar-color-theme.ts`

#### Policies
| Element | Color |
|---------|-------|
| Governance section icon | indigo `#525EA7` solid tile |
| Notice icon | cyan `#5FACD3` solid tile |
| Membership note icon | gold `#FFC349` solid tile (ink `#4A2E0A`) |
| Highlight label | indigo text; container stays neutral |

**Source:** `course-info-color-theme.ts` → `COURSE_INFO_POLICIES`, `PoliciesScreen.tsx`

#### Syllabus
| Element | Color |
|---------|-------|
| Hero badge | gold wash; text `#5C2E12` |
| Hero stat (section count) | orange `#FB6C00` |
| Accordion section icons | `SOLID_THUMB_CYCLE` by index (solid tiles) |
| PDF row thumb | cycle index 0 |

**Source:** `SyllabusScreen.tsx`, `course-info-color-theme.ts`

#### Office Hours
| Element | Color |
|---------|-------|
| Form section icon | cyan `#5FACD3` solid tile |
| Requests section icon | indigo `#525EA7` solid tile |
| Selected priority chip | orange `#FB6C00` fill, white text |
| Submit CTA | orange `#FB6C00` |

**Source:** `OfficeHoursScreen.tsx`, `COURSE_INFO_OFFICE_HOURS`, `COURSE_INFO_ACTION`

#### Progress Review
| Element | Color |
|---------|-------|
| Hero badge | gold wash |
| Hero overall % | orange `#FB6C00` |
| Category progress bars | quiz indigo, homework cyan, midterm orange, attendance gold, classroom sky, overall orange |
| Section card icons | strengths gold, focus orange, assessments indigo, practice orange, attendance gold, classroom amber, action plan cyan |
| Bullet checkmarks | indigo `#525EA7` |

**Source:** `ProgressReviewScreen.tsx`, `COURSE_INFO_PROGRESS_REVIEW_SECTIONS`

#### Course Evaluation
| Element | Color |
|---------|-------|
| Module primary / likert dots | indigo `#525EA7` |
| Overall metric | gold `#F9B637` |
| Recommend metric | pink `#F5788B` |
| Pass goal metric | indigo `#525EA7` |
| NPS bar + score | orange `#FB6C00` |
| EC flash icon | gold `#FFC349` |
| Submit CTA | orange `#FB6C00` |
| Pending/rejected | semantic orange/red (unchanged) |

**Source:** `CourseEvaluationScreen.tsx`, `COURSE_INFO_EVALUATION`

#### Recommendation Letters
| Element | Color |
|---------|-------|
| Request card icon | pink `#F5788B` solid tile |
| Form section icon | indigo `#525EA7` solid tile |
| Selected purpose chip | orange `#FB6C00` fill |
| Selected course/instructor chip | indigo border + soft wash |
| Submit CTA | orange `#FB6C00` |

**Source:** `RecommendationsScreen.tsx`, `COURSE_INFO_RECOMMENDATION`

#### Announcement detail
| Element | Color |
|---------|-------|
| AI Summary card | pink `#F5788B` wash + accent |
| Body info/callout boxes | cyan `#5FACD3` (via WebView accent) |
| Comment send | orange `#FB6C00` |
| Attachments/reactions | indigo accents |

**Source:** `AnnouncementDetailScreen.tsx`, `courseInfoAiSummaryStyle()`

#### Course Info — shared base
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#525EA7` | Section headers, chips, links |
| `secondary` | `#5FACD3` | Info washes |
| `action` | `#FB6C00` | Primary CTAs (submit, send) |
| `highlight` / `aiSummary` | `#F5788B` | AI summary, emphasis |
| `badge` | `#FFC349` | Hero badges |

**Source:** `expo/src/lib/course-info-color-theme.ts`, `course-info-shared.tsx`

---

### Settings & Support

#### Settings
| Row | Icon tile |
|-----|-----------|
| Profile avatar | indigo `#525EA7` |
| Edit profile | indigo `#525EA7` |
| Password & security | orange `#FF6A1C` |
| Membership plan | gold `#FFC349` |
| Notifications | cyan `#5FACD3` |
| Appearance | pink `#F5788B` |
| Help center | indigo `#525EA7` |
| Announcements | orange `#FF6A1C` |
| Sign out | destructive red (unchanged) |

**Source:** `SettingsScreen.tsx`, `SETTINGS_ROW_THUMBS`

#### Help Center
| Element | Color |
|---------|-------|
| Quick actions header | orange `#FF6A1C` solid tile |
| Submit ticket link | orange `#FF6A1C` |
| Report bug link | pink `#F5788B` |
| Feature request link | amber `#FFAE56` |
| Membership plans link | gold `#FFC349` |
| Account settings link | indigo `#525EA7` |
| FAQ section header | indigo `#525EA7` |
| Info footer tip | cyan `#5FACD3` |

**Source:** `HelpCenterScreen.tsx`, `HELP_CENTER_LINK_THUMBS`

#### Submit Ticket · Report Bug · Feature Requests
| Form | Form icon | Tips icon | Submit CTA |
|------|-----------|-----------|------------|
| Ticket | cyan `#5FACD3` | gold `#FFC349` | orange `#FB6C00` |
| Bug | orange `#FF6A1C` | gold `#FFC349` | orange `#FB6C00` |
| Feature | pink `#F5788B` | amber `#FFAE56` | orange `#FB6C00` |

**Source:** `SupportFormScreen.tsx`, `SUPPORT_FORM_THUMBS`, `SUPPORT_ACTION`

#### Membership (Plans)
| Tier | Hero card fill | Billing CTA |
|------|----------------|-------------|
| Scholar | indigo `#525EA7` + 14–24% appearance accent | — (free) |
| Explorer | cyan `#5FACD3` + appearance accent blend | indigo-dark solid |
| Trailblazer | gold `#FFC349` + appearance accent blend | gold-dark `#C9922A` |
| Subtle plan rows | neutral surface + tier accent thumb only | tier accent |

**Hero card** (`membershipTierHeroCardStyle`) — solid Color Hunt tier fill blended with appearance accent (16% light / 28% dark). Animated bubbles use tier palette swatches (amber/yellow for Trailblazer, cyan/sky for Explorer, indigo/sky for Scholar) plus one bubble tinted from the user's theme accent. Explore uses `tokens.surface`; Billing uses tier accent solid.

**Solid tier badge** (`membershipTierSolidBadge`) — drawer header + profile menu:

| Tier | Fill | Text |
|------|------|------|
| Scholar | `#525EA7` indigo | `#FFFFFF` |
| Explorer | `#5FACD3` cyan | `#FFFFFF` |
| Trailblazer | `#FFC349` gold | `#4A2E0A` warm ink |

No dot on drawer badge — solid pill only. Settings “Membership plan” row uses gold tile `#FFC349`.

**Sources:** `membership-plans.ts`, `membership-plan-theme.ts`, `StudentDrawer.tsx`, `ProfileMenu.tsx`, `MembershipScreen.tsx`

#### Shared support base
| Token | Hex |
|-------|-----|
| `primary` | `#525EA7` |
| `action` | `#FB6C00` |
| `success` | `#22C55E` |

**Source:** `expo/src/lib/support-color-theme.ts`

#### Auth / Login (welcome, university picker, student credentials)

| Element | Color |
|---------|-------|
| Primary CTA (Login, Continue) | orange `#FB6C00` |
| Typewriter headline | indigo `#525EA7` (light) / cyan `#5FACD3` (dark) |
| Eyebrow / links / chevrons | cyan `#5FACD3` |
| Field icon tiles | indigo soft wash + indigo icon |
| Faculty portal tile | indigo `#525EA7` solid |
| Guest portal tile | cyan `#5FACD3` solid |
| Summer portal tile | gold `#FFC349` solid (ink `#4A2E0A`) |
| Canvas bubbles | indigo + cyan + amber washes |
| University rows (selected) | **school `primary_color`** (brand identity) |

Containers (welcome rows, inputs, canvas) stay neutral — Color Hunt applies to CTAs, tiles, headlines, links, and bubbles only.

**Sources:** `login-color-theme.ts`, `login-theme.ts`, `LoginCanvasBubbles.tsx`, `login.tsx`, `StudentLoginPanel.tsx`

---

### Shell & Chrome

| Element | Color |
|---------|-------|
| Drawer tier pill | `membershipTierSolidBadge(tier)` — see Membership table |
| Profile menu tier pill | Same solid badge + tier icon in matching ink |
| Settings profile avatar | indigo `#525EA7` solid tile |

**Source:** `membership-plan-theme.ts`, `SETTINGS_PROFILE_THUMB`

---

## Quick copy — CSS custom properties

```css
:root {
  /* Warm — colorhunt.co/palette/ff6a1cffda62ffae56f5788b */
  --color-hunt-orange: #FF6A1C;
  --color-hunt-yellow: #FFDA62;
  --color-hunt-amber: #FFAE56;
  --color-hunt-pink: #F5788B;
  --color-hunt-orange-deep: #E05510;
  --color-hunt-pink-deep: #D86176;
  --color-hunt-ink: #4A2E0A;

  /* Cool — colorhunt.co/palette/ffc349525ea75facd397dde9 */
  --color-hunt-gold: #FFC349;
  --color-hunt-indigo: #525EA7;
  --color-hunt-indigo-deep: #3D4578;
  --color-hunt-cyan: #5FACD3;
  --color-hunt-sky: #97DDE9;

  /* Grades / attendance warm — colorhunt.co/palette/e73f1efb6c00f9b637ffdd9c */
  --grades-red: #E73F1E;
  --grades-orange: #FB6C00;
  --grades-gold: #F9B637;
  --grades-cream: #FFDD9C;
  --grades-ink: #5C2E12;
  --grades-ink-muted: #8B5A2B;

  /* Shared module tokens */
  --module-primary: #525EA7;
  --module-action: #FB6C00;
  --module-action-ink: #FFFFFF;

  /* Status */
  --status-success: #22C55E;
  --status-missed: #EF4444;
  --status-pending: #FB6C00;
  --status-skipped: #64748B;

  /* Podium */
  --podium-first: #FFC349;
  --podium-second: #525EA7;
  --podium-third: #FF6A1C;

  /* Membership tier badges (solid pills) */
  --tier-scholar-fill: #525EA7;
  --tier-scholar-ink: #FFFFFF;
  --tier-explorer-fill: #5FACD3;
  --tier-explorer-ink: #FFFFFF;
  --tier-trailblazer-fill: #FFC349;
  --tier-trailblazer-ink: #4A2E0A;

  /* Utility */
  --thumb-locked: #636366;
  --thumb-empty: #8E8E93;
}
```

---

## Source file index

| File | Exports |
|------|---------|
| `flashcard-difficulty-theme.ts` | `COLOR_HUNT`, flashcard faces & badges |
| `codebench-badge-theme.ts` | `COLOR_HUNT_COOL`, CodeBench KPIs & badges |
| `solid-list-thumb.ts` | `SOLID_THUMB_CYCLE`, thumb helpers |
| `grades-theme.ts` | `GRADES_WARM`, category thumbs, performance colors |
| `assessment-report-theme.ts` | `REPORT_SOLID`, report UI |
| `dashboard-theme.ts` | Dashboard KPIs, engagement, insights |
| `lecture-list-theme.ts` | Lecture thumbs & status |
| `collaboration-list-theme.ts` | Groups/projects thumbs & status |
| `playground-list-theme.ts` | Playground CTAs & game status |
| `leaderboard-podium-theme.ts` | Podium medals & hero gradient |
| `attendance-overview-theme.ts` | Attendance KPI tiles & progress |
| `trade-center-theme.ts` | Trade center balances & actions |
| `calendar/calendar-color-theme.ts` | Calendar headers, dots, event types |
| `course-info-color-theme.ts` | Course Info module accents (all submodules) |
| `support-color-theme.ts` | `SUPPORT_COLOR`, `SUPPORT_ACTION`, `SETTINGS_ROW_THUMBS`, `HELP_CENTER_*`, `SUPPORT_FORM_THUMBS` |
| `membership-plans.ts` | `MEMBERSHIP_PLANS` tier card colors (Scholar/Explorer/Trailblazer) |
| `membership-plan-theme.ts` | `membershipTierSolidBadge()`, fixed plan resolution (no appearance override) |
| `office-hours/theme.ts` | Office hours hero wash (uses `courseInfoThemeFromTokens`) |
| `cora-home-theme.ts` | Cora home quick actions & KPIs |
| `cora-learn-theme.ts` | Cora learn tool thumbs |
| `cora-solve-theme.ts` | Cora solve tab |
| `cora-insights-theme.ts` | Cora insights KPIs |
| `analytics-more-theme.ts` | Analytics & More module |
| `note-list-utils.ts` | Notes list thumb by kind |

---

## Web migration checklist

- [ ] Import shared CSS variables (or Tailwind theme extension) from the table above
- [ ] Replace generic purple/blue list icons with **solid thumb cycle** or module-fixed swatches
- [ ] Keep list/card backgrounds on neutral grouped surface — color only thumbs, bars, chips, CTAs
- [ ] Align assessment report colors with `REPORT_SOLID` + performance bands
- [ ] Align grades hero and category breakdown with `GRADES_WARM` + category thumb map
- [ ] Align all leaderboards (practice, playground, attendance, classroom points, forum medals) with `PODIUM_MEDAL`
- [ ] Calendar: apply event-type color map; keep event rows neutral
- [ ] Course Info: apply `course-info-color-theme.ts` — solid section icons, orange CTAs, per-module progress/category colors
- [ ] Settings & Support: solid row icons, orange form CTAs (`#FB6C00`), tier-colored membership cards
- [ ] Shell: drawer + profile tier pills via `membershipTierSolidBadge` (solid gold Trailblazer, not purple wash)
- [ ] Trade Center & Attendance: colored icon chips + progress only — not full card recolor
- [ ] Do **not** tie Course Info, Support, or Membership colors to user appearance theme (Titanium/slate)
