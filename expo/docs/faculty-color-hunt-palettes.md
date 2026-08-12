# Faculty App — Color Hunt Palettes (Web Parity Guide)

Reference for aligning the **web instructor dashboard** with the Expo faculty app’s Color Hunt–based accents.

**Mobile source of truth:** `expo/src/lib/faculty-*-theme.ts` and shared libs listed below.  
**Shared palette definitions:** see [student-color-hunt-palettes.md](./student-color-hunt-palettes.md) for base `COLOR_HUNT`, `COLOR_HUNT_COOL`, `GRADES_WARM`, and `REPORT_SOLID`.  
**Layout / chrome:** [ios-native-module-design.md](./ios-native-module-design.md)  
**Last updated:** Aug 2026 — announcements, course notes, flashcards, summer camp, syllabus, groups/projects, dashboard KPIs.

---

## Faculty global tokens (use everywhere)

These repeat across content modules. **Do not** use the user’s appearance accent (purple/teal theme picker) for instructor content modules — bind to Color Hunt instead.

| Role | Hex | Mobile export | Usage |
|------|-----|---------------|--------|
| **Primary CTA** | `#FB6C00` | `GRADES_WARM.orange` · `*.action` | Publish, Save, Edit announcement, orange switches |
| **CTA ink** | `#FFFFFF` | `*.actionInk` | Text/icons on orange buttons |
| **Secondary link** | `#5FACD3` | `COLOR_HUNT_COOL.cyan` · `*.link` | Back, Edit nav, View links, pinned, course-note thumbs |
| **AI / intel label** | `#525EA7` | `COLOR_HUNT_COOL.indigo` · `*.ai` | “AI Summary”, generate icons, low priority |
| **Published / success** | `#22C55E` | `REPORT_SOLID.correct` | Published, active, approved |
| **Published ink** | `#FFFFFF` | `REPORT_SOLID.correctInk` | Text on green chips |
| **Draft / in progress** | `#FF6A1C` | `COLOR_HUNT.orange` | Draft status, medium priority |
| **High / danger** | `#EF4444` | `REPORT_SOLID.missed` | High priority, delete, deleted |
| **Pending** | `#FB6C00` | `REPORT_SOLID.pending` or `GRADES_WARM.orange` | Pending enrollment, waiting |
| **Pending (amber)** | `#FFAE56` | `COLOR_HUNT.amber` | Summer camp pending requests |
| **Inactive / muted** | `#636366` | `native.tertiaryLabel` | Inactive, hidden, disabled |

```css
/* Faculty content modules — copy into web global CSS */
:root {
  --faculty-action: #FB6C00;
  --faculty-action-ink: #FFFFFF;
  --faculty-link: #5FACD3;
  --faculty-ai: #525EA7;
  --faculty-published: #22C55E;
  --faculty-draft: #FF6A1C;
  --faculty-danger: #EF4444;
  --faculty-pending: #FB6C00;
  --faculty-pending-amber: #FFAE56;
}
```

---

## Design rules (faculty content modules)

1. **Neutral card bodies** — `secondaryGrouped` / theme surface. Never tint entire list rows with purple, indigo wash, or appearance accent.
2. **Color on accents only** — solid thumb tiles, status icon + label, CTAs, chart series, drawer icon gradients (dashboard/drawer only).
3. **Never color alone** — every status uses **icon + text label** (e.g. checkmark + “Published”, pin + “Pinned”, alert + “High priority”).
4. **Signature lecture-style list card** (Announcements, Course Notes, Flashcards, Summer Camp, Syllabus sections):
   - Background: neutral grouped surface
   - Border: 1px hairline / `tokens.border`
   - Radius: **16px**
   - Padding: **12px** horizontal + vertical
   - Min height: **88px** (list rows)
   - **SolidListThumbTile** on the left (see sizes below)
   - Title (`bodyEmphasis`) + 2-line preview (`caption`)
   - Status row: colored icon + `footnote` label + tertiary meta (`· Updated Aug 4`)
   - Trailing: chevron (read) or destructive/restore icon (edit lists)
5. **Primary actions = orange** — not appearance purple. Secondary navigation = cyan.
6. **AI summary** — show as plain preview text on list cards; on detail/composer use a **neutral inset card** with **indigo** “AI Summary” label only (no purple stripe, no full-width accent wash).
7. **Insight / tip banners** — neutral `secondaryGrouped` card + compact thumb tile; color only on eyebrow icon/label.
8. **Do not** stack bordered shadow cards inside list rows (old dashboard pattern).

### Solid thumb sizes

| Size | Dimensions | Radius | When |
|------|------------|--------|------|
| `list` | 56×56 | 14 | Default list cards |
| `compact` | 30×30 (≈8 radius) | 8 | Settings-style rows, insight banner |

Rotate list thumbs with `SOLID_THUMB_CYCLE` by index unless a module assigns a fixed swatch (e.g. course notes → always cyan).

---

## Status semantics (shared)

| Meaning | Color | Icon (Ionicons / Lucide) | Label example |
|---------|-------|--------------------------|---------------|
| Published / active | `#22C55E` | `checkmark-circle` | Published |
| Draft | `#FF6A1C` | `ellipse` (8px dot) | Draft |
| Pinned | `#5FACD3` | `pin` / `pin-outline` | Pinned |
| High priority | `#EF4444` | `alert-circle` | High priority |
| Medium priority | `#FF6A1C` | `warning-outline` | Medium priority |
| Low priority | `#525EA7` | `information-circle-outline` | Low priority |
| Pending | `#FFAE56` or `#FB6C00` | `time-outline` | Pending |
| Inactive | tertiary | `pause-circle-outline` | Inactive |
| Deleted | `#EF4444` | `trash-outline` | Deleted |
| AI generated | `#525EA7` | `sparkles-outline` | AI summary |

---

## Nav / module → theme file

| Faculty module | Theme file | Key exports |
|----------------|------------|-------------|
| Dashboard | `faculty-dashboard-theme.ts` | `FACULTY_DASHBOARD_KPI_THUMBS`, `FACULTY_CHART_COLORS` |
| Announcements | `faculty-announcement-theme.ts` | `FACULTY_ANNOUNCEMENT_COLOR`, priority/pinned meta |
| Course Notes | `faculty-course-notes-theme.ts` | `FACULTY_COURSE_NOTES_COLOR`, publish/draft status |
| Flashcards | `faculty-flashcard-theme.ts` | `FACULTY_FLASHCARD_COLOR`, deck status, switch track |
| Summer Camp | `faculty-summer-camp-theme.ts` | `FACULTY_SUMMER_CAMP_COLOR`, program/track/request thumbs |
| Syllabus | `course-info-color-theme.ts` | `COURSE_INFO_ACTION`, `COURSE_INFO_SYLLABUS_STATUS` |
| Calendar, Evaluations, Office Hours, etc. | `course-info-color-theme.ts` | Section-specific thumbs + `COURSE_INFO_ACTION` |
| Notifications, Discussions, Support | `faculty-communication-theme.ts` | `COMM_MODULES`, per-type notification colors |
| Groups, Projects, Course picker | `faculty-collab-theme.ts` | `FACULTY_COLLAB_COLOR`, group/project status meta |
| Manage Quizzes / Homework / Exams | `faculty-assessment-theme.ts` | `FACULTY_ASSESSMENT_COLOR`, assessment thumbs |
| Question Bank | `faculty-question-bank-theme.ts` | `FACULTY_QUESTION_BANK_COLOR`, topic/question thumbs |
| Attendance | `faculty-attendance-theme.ts` | `FACULTY_ATTENDANCE_COLOR`, status/meeting colors |
| Classroom Points | `faculty-classroom-points-theme.ts` | `FACULTY_CLASSROOM_POINTS_COLOR`, points/assignment |
| Course Evaluations | `faculty-course-evaluations-theme.ts` | `FACULTY_EVALUATIONS_COLOR`, proof/survey status |
| Practice | `faculty-practice-theme.ts` | `FACULTY_PRACTICE_COLOR`, topic/student thumbs |
| Playground | `faculty-playground-theme.ts` | `FACULTY_PLAYGROUND_COLOR`, session/passcode |
| Projects (panels) | `faculty-projects-theme.ts` | `FACULTY_PROJECTS_COLOR`, score/presentation |
| Action sheets / modals | `faculty-sheet-theme.ts` | `FACULTY_SHEET_COLOR`, shared `faculty-collab-sheet-ui` |
| Assessments / Results / Reports | `assessment-report-theme.ts` | `REPORT_SOLID`, performance bands |
| Shell / drawer / native chrome | `faculty-native-theme.ts` | `NATIVE`, `MODERN` (brand stripe, KPI grid) |

---

## Module token details

### Announcements — `FACULTY_ANNOUNCEMENT_COLOR`

| Token | Hex | Usage |
|-------|-----|--------|
| `action` | `#FB6C00` | Publish, Edit announcement footer |
| `link` | `#5FACD3` | Back, Edit nav, attachment icons |
| `ai` | `#525EA7` | AI Summary label |
| `pinned` | `#5FACD3` | Pinned status |
| `high` | `#EF4444` | High priority |
| `medium` | `#FF6A1C` | Medium priority |
| `low` | `#525EA7` | Low priority |
| `active` | `#22C55E` | Active posts |

**List card:** `FacultyAnnouncementCard` — megaphone thumb (cycle), preview = AI/plain summary text, no nested purple box.

### Course Notes — `FACULTY_COURSE_NOTES_COLOR`

| Token | Hex | Usage |
|-------|-----|--------|
| `published` | `#22C55E` | Published notes |
| `draft` | `#FF6A1C` | Draft notes |
| `deleted` | `#EF4444` | Deleted tab |

**Thumb:** fixed `#5FACD3` (matches student Course Notes tab).  
**List card:** `FacultyCourseNoteListCard` — mirrors student `NoteListCard`.

### Flashcards — `FACULTY_FLASHCARD_COLOR`

| Token | Hex | Usage |
|-------|-----|--------|
| `action` | `#FB6C00` | Primary CTAs, switch ON track |
| `link` | `#5FACD3` | Secondary links |
| `published` / `draft` | green / `#FF6A1C` | Deck status |
| `practiceHub` | `#5FACD3` | Practice Hub badge text |
| `generateIcon` | `#525EA7` | Generate / AI wash |

**List card:** `FacultyFlashcardDeckListCard` — thumb by deck id, trash trailing action.

### Summer Camp — `FACULTY_SUMMER_CAMP_COLOR`

| Token | Hex | Usage |
|-------|-----|--------|
| `action` / `link` | orange / cyan | Same as global |
| `programThumb` | `#FF6A1C` | Programs list |
| `trackThumb` | `#525EA7` (hash by id) | Tracks |
| `requestThumb` | `#5FACD3` | Enrollment requests |
| `pending` | `#FFAE56` | Pending status |

### Syllabus — `COURSE_INFO_SYLLABUS_STATUS`

| Status | Background | Text |
|--------|------------|------|
| Published | `#22C55E` | `#FFFFFF` |
| Draft | `rgba(#FF6A1C, 0.18)` | `#E05510` |
| Required | `rgba(#525EA7, 0.2)` | `#525EA7` |
| Custom | `rgba(#FFC349, 0.22)` | `#4A2E0A` |
| Hidden | neutral wash | `#636366` |

**CTAs:** `COURSE_INFO_ACTION` → orange Publish / Save draft.

### Dashboard — `FACULTY_DASHBOARD_KPI_THUMBS`

| KPI | Thumb fill |
|-----|------------|
| Active quizzes | `#525EA7` |
| Students | `#5FACD3` |
| Quiz attempts | `#FF6A1C` |
| Pending issues | `#FF6A1C` (clear: `#636366`) |
| Upcoming | `#FFDA62` (ink `#4A2E0A`) |
| Submissions 24h | `#F5788B` |

**Charts:** `FACULTY_CHART_COLORS` — cyan primary, indigo dark, amber target line.

### Communication — `COMM_MODULES`

| Module | Accent |
|--------|--------|
| Notifications | orange |
| Discussions | indigo |
| Student Support | blue |

Use `notificationTypeStyle()` for per-type icon colors in notification lists.

### Groups / Projects / Course picker — `FACULTY_COLLAB_COLOR`

| Token | Hex | Usage |
|-------|-----|--------|
| `action` | `#FB6C00` | Approve, Try again |
| `link` | `#5FACD3` | Review, selected course checkmark, refresh tint |
| `tabActive` | `#525EA7` | Faculty pill tab active icon |
| `courseThumb` | `#525EA7` | Course picker thumb (fixed indigo) |
| `nudge` | `#FF6A1C` | Pending-review banner |
| `danger` | `#EF4444` | Reject |

**List cards:** `FacultyGroupListCard`, `FacultyProjectListCard` — signature rows with compact thumb, status icon + label, orange approve / cyan review / red reject footers.

**Course picker:** `FacultyCoursePickerRow` — neutral grouped card, indigo thumb, cyan checkmark when active (no purple wash).

**Tabs:** `FacultySignatureTabBar` via `FacultyModuleTabBar` — signature underline nav with indigo active rail, 14px labels, optional icons, orange count pills. Used across all faculty modules (Groups, Projects, Flashcards, Summer Camp, etc.). Student modules keep pill tabs.

**Group/project status:** reuse `collaboration-list-theme.ts` accents (approved green, pending orange, rejected red).

### Action sheets — `FACULTY_SHEET_COLOR` + `faculty-collab-sheet-ui.tsx`

| Token | Hex | Usage |
|-------|-----|--------|
| `action` | `#FB6C00` | Approve, Save, Submit, primary sheet CTAs |
| `link` | `#5FACD3` | Done, Edit, Add, open links, refresh tint |
| `ai` | `#525EA7` | AI Summary label + icon |
| `thumb` | `#525EA7` | `FacultySheetHero` solid thumb tile |
| `nudge` | `#FF6A1C` | Review workflow eyebrow |
| `danger` | `#EF4444` | Delete confirm, reject |

**Hero:** neutral `secondaryGrouped` card + `SolidListThumbTile` — no purple gradient wash.

**Chrome:** cyan Done; orange Save/Submit; stat chips use Color Hunt sheet tones via `useFacultySheetTones()`.

---

## Anti-patterns (faculty)

| Avoid | Use instead |
|-------|-------------|
| `tokens.accent` (appearance purple) on list cards, AI blocks, CTAs | Module `action` / `link` / `ai` tokens |
| Purple “Pinned” / “live” pills without icons | Cyan pin icon + “Pinned” label |
| Nested `accentSoft` summary box inside card | Plain preview text on list; neutral inset on detail |
| Full-width purple insight banners | Neutral banner + colored eyebrow only |
| Uppercase screaming section headers | Title Case (`Title Case`) |
| Color-only status dots | Icon + label |
| Stacked shadow cards on every list row | Single signature list card |

---

## Web implementation checklist

- [ ] Add faculty CSS variables (above) alongside student variables.
- [ ] Map **Publish / Save / Edit primary** buttons to `--faculty-action`.
- [ ] Map **Back / secondary links / pinned** to `--faculty-link`.
- [ ] Map **Published** chips to `--faculty-published`; **Draft** to `--faculty-draft`.
- [ ] Implement **solid thumb** component (56×56 list, 30×30 compact) with `SOLID_THUMB_CYCLE`.
- [ ] Status rows: require icon + label in all announcement, note, deck, and camp lists.
- [ ] Announcement detail: orange footer CTA, cyan nav links, indigo AI label, neutral hero card.
- [ ] Course notes faculty list: match student `NoteListCard` layout with draft/publish status.
- [ ] Syllabus: orange Publish, green Published badge, indigo Required.
- [ ] Keep dashboard KPI/chart colors on `FACULTY_CHART_COLORS` — not Tailwind emerald defaults.

---

## Source file index

| File | Exports |
|------|---------|
| `faculty-announcement-theme.ts` | `FACULTY_ANNOUNCEMENT_COLOR`, pinned/priority meta |
| `faculty-course-notes-theme.ts` | `FACULTY_COURSE_NOTES_COLOR`, note status |
| `faculty-flashcard-theme.ts` | `FACULTY_FLASHCARD_COLOR`, deck/editor helpers |
| `faculty-summer-camp-theme.ts` | `FACULTY_SUMMER_CAMP_COLOR`, camp status/thumbs |
| `faculty-dashboard-theme.ts` | KPI thumbs, chart colors |
| `faculty-communication-theme.ts` | `COMM_MODULES`, notification type styles |
| `faculty-collab-theme.ts` | `FACULTY_COLLAB_COLOR`, group/project/course picker |
| `faculty-assessment-theme.ts` | Quizzes, homework, mid/final exams |
| `faculty-attendance-theme.ts` | Roll call, meetings, log; meeting chip + status meta |
| `faculty-question-bank-theme.ts` | Question bank list + preview |
| `faculty-classroom-points-theme.ts` | Classroom points tasks + awards |
| `faculty-course-evaluations-theme.ts` | Course evaluations list |
| `faculty-sheet-theme.ts` | `FACULTY_SHEET_COLOR`, action sheet accents |
| `course-info-color-theme.ts` | Syllabus, office hours, evaluations, shared `COURSE_INFO_ACTION` |
| `grades-theme.ts` | `GRADES_WARM` (faculty orange CTA source) |
| `assessment-report-theme.ts` | `REPORT_SOLID` (published / missed / pending) |
| `codebench-badge-theme.ts` | `COLOR_HUNT_COOL` |
| `flashcard-difficulty-theme.ts` | `COLOR_HUNT` warm palette |
| `solid-list-thumb.ts` | `SOLID_THUMB_CYCLE`, thumb helpers |
| `constants/faculty-native-theme.ts` | `NATIVE`, grouped surfaces, shell chrome |

### Mobile components (reference implementations)

| Component | Pattern |
|-----------|---------|
| `FacultyAnnouncementCard.tsx` | Signature list + status chips |
| `FacultyAnnouncementDetailModal.tsx` | Detail hero + orange CTA |
| `FacultyAnnouncementsInsight.tsx` | Neutral insight banner |
| `FacultyCourseNoteListCard.tsx` | Student parity list card |
| `FacultyFlashcardDeckListCard.tsx` | Deck list + delete |
| `FacultySummerCampListCards.tsx` | Camp signature rows |
| `FacultyCollabListCards.tsx` | Groups, projects, course picker rows |
| `FacultySignatureTabBar` / `FacultyModuleTabBar` | Signature underline tabs (all faculty modules) |
| `NoteListCard.tsx` (student) | Course notes student parity target |

---

## Related docs

- [Student Color Hunt palettes](./student-color-hunt-palettes.md) — shared base palettes + CSS variables
- [iOS native module design](./ios-native-module-design.md) — layout, grouped lists, Liquid Glass search dock
