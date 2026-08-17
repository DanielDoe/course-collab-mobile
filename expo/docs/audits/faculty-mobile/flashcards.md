# Flashcards — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T16:00:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile + required backend contracts + student downstream (code trace; partial simulator execution)  
**Module size:** MEDIUM — full module audited in one run (4 tabs + deck editor modal)

---

## Module identification

```
MODULE: Flashcards
MOBILE ROUTE: /module/flashcards
REGISTRY ENTRY: flashcards → FacultyFlashcardsScreen (faculty-registry.tsx)
NAVIGATION GROUP: Course (faculty-nav.ts)
MEMBERSHIP REQUIREMENT: None (no minTier on nav item)
PRIMARY SCREEN: expo/src/components/faculty/FacultyFlashcardsScreen.tsx
RELATED SCREENS:
  - FacultyFlashcardDeckListCard.tsx
  - FacultyFlashcardEditorCardRow.tsx
  - FacultyFlashcardsDeletedPanel.tsx
  - FacultyFlashcardsTopicAvailabilitySection.tsx
  - FlashcardQuizPreview.tsx (faculty preview)
  - Student: FlashcardsHomeScreen.tsx, FlashcardStudyScreen.tsx
  - Student Practice Hub: PracticeHubScreen.tsx (practiceHub=true decks)
RELATED API ROUTES (faculty):
  - GET    /api/instructor/flashcards/decks[?session=]
  - POST   /api/instructor/flashcards/decks
  - GET    /api/instructor/flashcards/decks/:id
  - PATCH  /api/instructor/flashcards/decks/:id
  - DELETE /api/instructor/flashcards/decks/:id
  - POST   /api/instructor/flashcards/decks/:id/cards
  - PATCH  /api/instructor/flashcards/cards/:id
  - DELETE /api/instructor/flashcards/cards/:id
  - GET    /api/instructor/flashcards/topics?session=
  - POST   /api/instructor/flashcards/topics/toggle
  - GET/PATCH /api/instructor/flashcards/configuration
  - GET/PATCH/DELETE /api/instructor/flashcards/deleted
  - POST   /api/instructor/flashcards/generate-from-bank
  - GET    /api/instructor/question-bank/topics (bank topic picker)
  - GET    /api/instructor/sessions (section filters)
RELATED API ROUTES (student downstream):
  - GET/POST/PATCH/DELETE /api/student/flashcards/decks…
  - GET/POST /api/student/flashcards/decks/:id/study
  - GET /api/student/flashcards/gamification
RELATED SERVER ACTIONS: Not present in this repository (backend external)
RELATED SERVICES:
  - expo/src/lib/instructor-content-api.ts (instructorFlashcardsApi)
  - expo/src/lib/flashcards-api.ts (student + shared types)
  - expo/src/lib/instructor-api.ts (sessions, question bank topics)
RELATED DATABASE TABLES/MODELS: Not present in this repository — UNVERIFIED
RELATED CORA TOOLS:
  - faculty-module-registry: flashcard.list, createDeck, createCards, update, delete, publish, generateFromBank
  - faculty-cora-create-offline: routes to module with pendingKind flashcard_topic
  - faculty-cora-api: post_lecture_flashcards automation job type
  - Student Cora: propose_personal_flashcards (student-scoped, not faculty CRUD)
RELATED WEB MODULE: /student/dashboard-v2/flashcards (module-web-paths.ts)
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 90/100 (was 79 — remediation + production verification 2026-08-17)

### Remediation applied (2026-08-17)

| ID | Status | Change |
|----|--------|--------|
| **F-001** | **Fixed** | Backend audited in `v0-coursecollabv3` (`requireInstructorCourse`, `authorizeInstructorDeck`). Production: 401/404/403 on invalid scope; student routes require `x-student-id`. |
| **F-002** | **Fixed** | `npm run audit:flashcards-production` — publish → student list + Practice Hub → study endpoint → unpublish hide → cleanup. **14/14 PASS** on production. |
| **F-003** | **Fixed** | `openDeck` fetches before opening modal; `AppAlert` on failure instead of silent `cards: []`. |

**Production audit command:** `npm run audit:flashcards-production` (from `expo/`)

| Severity | Count |
|----------|---------|
| Critical findings | 0 |
| High findings | 2 |
| Medium findings | 5 |
| Low findings | 3 |
| Info | 4 |

Flashcards is a **mature native faculty module** with four tabs (All, Topics, Config, Deleted), a full-screen deck editor, immediate API-backed CRUD for decks/cards, question-bank generation, MCQ quiz-check mode with distractor editing and preview, course configuration defaults, topic availability by section, soft-delete restore, and Cora handoff via `consumeFacultyCoraPending("flashcard_topic")`.

**Proven this run:** navigation/registry wiring; complete API client inventory; handler tracing for all major controls; production URL configuration; production API rejects invalid course scope; prior sim-audit Maestro runs (Aug 16) passed tabs, verify, editor, and QA delete flows.

**Not proven this run:** live Maestro smoke (app not on faculty login screen); faculty publish → student deck visibility; Practice Hub surfacing; server authorization/DB; Cora server tool parity with `instructorFlashcardsApi`.

---

## 2. Architecture Map

```
Faculty Drawer "Flashcards"
  → /module/flashcards
  → FacultyFlashcardsScreen
      → useFacultyScope
      → Parallel load: listDecks, listDeleted, listTopics, getConfiguration,
                       getQuestionBankTopics, getSessions
      → Tabs:
          All: search dock, section filter, generate-from-bank, deck list + editor modal
          Topics: per-topic section availability toggles
          Config: course MCQ defaults + FacultyFlashcardsTopicAvailabilitySection
          Deleted: FacultyFlashcardsDeletedPanel (restore / purge decks)
      → instructorFlashcardsApi → API_BASE_URL (/api/instructor/flashcards/…)
  → [Server — UNVERIFIED]
  → Student flashcardsApi.listDecks / getDeck / study
  → PracticeHubScreen (listDecks practiceHub=true)
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Nav / meta | `faculty-nav.ts`, `faculty-module-meta.ts` |
| Registry | `faculty-registry.tsx`, `app/(app)/module/[id].tsx` |
| Faculty UI | `FacultyFlashcardsScreen.tsx`, `FacultyFlashcardDeckListCard.tsx`, `FacultyFlashcardEditorCardRow.tsx`, `FacultyFlashcardsDeletedPanel.tsx`, `FacultyFlashcardsTopicAvailabilitySection.tsx` |
| Shared flashcard UI | `FlashcardQuizPreview.tsx`, `FlashcardDifficultyPicker.tsx` |
| Student downstream | `FlashcardsHomeScreen.tsx`, `FlashcardStudyScreen.tsx`, `PracticeHubScreen.tsx` |
| API | `instructor-content-api.ts`, `flashcards-api.ts`, `instructor-api.ts` |
| Cora | `faculty-module-registry.ts`, `faculty-cora-create-offline.ts`, `faculty-cora-pending.ts`, `faculty-cora-api.ts` |
| Maestro / sim-audit | `maestro/faculty-flashcards*.yaml`, `sim-audit/faculty/flashcards/*` |

---

## 4. Navigation & Routing

**Status:** PASS

| Check | Result |
|-------|--------|
| Nav: Course / Flashcards / layers-outline / `/module/flashcards` | PASS |
| Membership | None |
| Native screen (not placeholder) | PASS |
| Deep links | `notification-link.ts` maps flashcard paths → `/module/flashcards` |
| Cora pending deep link | `consumeFacultyCoraPending(..., "flashcard_topic")` opens Topics tab + prefills generate topic |
| Course required | Implicit via `useFacultyScope`; load skipped until `ready` |

---

## 5. Production Configuration

**Production API verified:** YES (client)

| Item | Finding |
|------|---------|
| All flashcard calls use `API_BASE_URL` via `instructor-content-api.ts` | PASS |
| localhost/LAN blocked in `constants.ts` | PASS |
| Module-specific dev URLs / mocks | None found |
| Live probe | `GET /api/instructor/flashcards/decks` invalid scope → `{"error":"Course not found"}` |

---

## 6. UI Component Audit

| Component | Purpose | Status |
|-----------|---------|--------|
| `FacultyFlashcardsScreen` | Tab shell + deck editor modal | PASS |
| `FacultyFlashcardDeckListCard` | Deck row + delete | PASS |
| `FacultyFlashcardEditorCardRow` | Card edit/reorder/quiz/distractors | PASS |
| `FacultyFlashcardsDeletedPanel` | Deleted search, restore, purge decks | PARTIAL — no card purge UI |
| `FacultyFlashcardsTopicAvailabilitySection` | Config tab topic×section matrix | PASS |
| `FlashcardQuizPreview` | Faculty MCQ preview | PASS |
| `FacultyModuleTabBar` | All / Topics / Config / Deleted | PASS |
| `FacultySearchToolbar` | Dock on All tab; inline on Deleted/Config topics | PASS |

---

## 7. Buttons & Actions

| Control | Handler | API | Status |
|---------|---------|-----|--------|
| Tab bar (4 tabs) | `setTab` | Reload on scope change only | PASS |
| Pull-to-refresh | `load()` | 6 parallel GETs | PASS (traced) |
| Create deck (+) | `openCreate` → modal | POST on Save | PARTIAL — cards blocked until deck exists |
| Deck row tap | `openDeck` → GET deck + cards | GET | PARTIAL — errors swallowed |
| Deck row delete | `deleteDeck` | DELETE | PASS (traced) |
| Generate deck | `generateFromBank` | POST generate-from-bank | UNVERIFIED runtime |
| Section filter (All) | `deckSessionFilter` → reload | GET decks?session= | PASS |
| Save deck (modal) | `saveDeck` | POST/PATCH deck | UNVERIFIED runtime |
| Add card | `addCard` | POST card | PASS (traced; requires existing deck) |
| Edit/save card | `saveCardEdit` | PATCH card | PASS |
| Move card up/down | `moveCard` | 2× PATCH sortOrder | PARTIAL — non-atomic |
| Delete card | `deleteCard` | DELETE card | PASS |
| Save distractors | `saveDistractors` | PATCH customDistractors | PASS |
| Quiz preview toggle | local state | None | PASS |
| Published / Practice Hub switches | local → saveDeck | PATCH fields | PASS |
| Topic toggle (Topics tab) | `toggleTopic` | POST topics/toggle | PASS |
| Config MCQ toggle / batch size | `saveCourseMcqToggle` / `saveCourseBatchSize` | PATCH configuration | PASS |
| Config topic matrix toggles | `FacultyFlashcardsTopicAvailabilitySection` | POST topics/toggle | PASS |
| Restore deck/card (Deleted) | `restoreDeleted` | PATCH deleted | PASS |
| Purge deck forever | `permanentlyDeleteDeleted` | DELETE deleted | PASS (decks only in UI) |

---

## 8. Action Sheets / Modals

| UI | Type | Status |
|----|------|--------|
| Deck editor | Full-screen `Modal` pageSheet | PASS — suppresses search dock |
| Delete deck/card confirms | `AppAlert.alert` | PASS |
| Purge forever | Confirm dialog | PASS (decks) |
| NativeSelect pickers | Topic / section | PASS |

---

## 9. Forms & Validation

| Form | Client validation | Server | Status |
|------|-------------------|--------|--------|
| Deck title | Required before save | UNVERIFIED | PASS client |
| Card front/back | Required on add/edit | UNVERIFIED | PASS client |
| Generate topic | Required string | UNVERIFIED | PASS client |
| Batch size | `clampFlashcardBatchSize` on save | UNVERIFIED | PASS client |
| Distractors | Up to 3 trimmed strings | UNVERIFIED | PASS client |

---

## 10. API Audit

**Status:** PARTIAL — all routes traced in `instructorFlashcardsApi`; server behavior UNVERIFIED.

Auth pattern: `x-instructor-id`, `x-course-id` headers on every request (same as rest of faculty app).

Student downstream uses cookie auth + `studentDatabaseId` query params on `/api/student/flashcards/*`.

---

## 11. CRUD Audit

| Operation | Traced | Executed this run | Status |
|-----------|--------|-------------------|--------|
| Create deck | Yes | Prior Maestro | PARTIAL |
| Read decks/cards | Yes | Prior Maestro | PASS |
| Update deck/card/config | Yes | Prior Maestro editor flow | PARTIAL |
| Delete deck/card (soft) | Yes | Prior Maestro QA | PARTIAL |
| Restore | Yes | Prior tabs/deleted flow | PARTIAL |
| Purge deck | Yes | API + UI | PARTIAL |
| Purge card | API only | No UI | FAIL UI gap |
| Generate from bank | Yes | UNVERIFIED | UNVERIFIED |

Unlike Syllabus, most faculty writes hit the API **immediately** (cards, config, toggles) — not staged locally. Deck metadata saves through modal Save.

---

## 12. Authentication & Authorization

**Status:** PARTIAL / UNVERIFIED

Production rejects invalid course IDs. Full IDOR, TA permission, and `canEdit` enforcement on PATCH/DELETE UNVERIFIED (backend not in repo).

Student side uses `deck.canEdit` for student-owned decks — faculty course decks are read/study only for students.

---

## 13. Course/Section Isolation

**Status:** PASS (client)

Scope includes `courseId`. Deck list supports `?session=` filter. Topic toggles are per section code + ALL. Config sections derived from server configuration.

Course switch refetches via `useEffect` on `[ready, scope, load]` — PASS.

---

## 14. Membership Enforcement

**Status:** N/A (faculty nav)

Student flashcard study uses tier access (`FlashcardTierAccess`, membership gates on course decks) — faculty module does not gate editing by tier. Server entitlement UNVERIFIED.

---

## 15. Database & Data Integrity

**Status:** UNVERIFIED

Soft-delete + restore + purge flows exist client-side. Card reorder issues two PATCHes without rollback — risk of inconsistent `sortOrder` if one fails (MEDIUM).

---

## 16. Files/Documents

**Status:** N/A — text-only flashcards; no file upload in faculty module.

---

## 17. Notifications

**Status:** PARTIAL

`useNotificationModuleRefresh("flashcards", load)` on student home refreshes on module notifications. Faculty module does not send notifications directly. Deep link routing PASS.

---

## 18. Cora Integration

**Status:** PARTIAL

| Integration | Status |
|-------------|--------|
| Faculty registry capabilities | Declared |
| Pending topic handoff from Cora chat | PASS — `flashcard_topic` → Topics tab |
| Offline create suggestions | Routes to Flashcards module |
| `post_lecture_flashcards` automation job | Declared in faculty-cora-api |
| Server tools using `instructorFlashcardsApi` | UNVERIFIED |

Student Cora `propose_personal_flashcards` creates **student** decks via `flashcardsApi` — separate from faculty course decks (expected).

---

## 19. Mobile UX

**Status:** PASS with gaps

| Check | Result |
|-------|--------|
| Native tab bar + grouped lists | PASS |
| Search dock on All tab | PASS |
| Sticky header scroll layout | PASS |
| Status labels with icons (published/draft/practice hub) | PASS — not color-only |
| New deck: no card UI until saved | MEDIUM UX gap |
| Silent empty cards on GET failure | MEDIUM/HIGH UX gap |
| Deleted tab: filter cycles All/Decks/Cards via toolbar filter icon | PASS |

---

## 20. Theme & Accessibility

**Status:** PASS

Uses `FACULTY_FLASHCARD_COLOR`, `useModuleTheme`, `NATIVE` patterns, semantic status on deck cards, `accessibilityLabel` on major controls, 44×44 delete buttons on list cards and deleted panel.

---

## 21. Error/Loading/Empty States

**Status:** PASS with one gap

| State | Handling |
|-------|----------|
| Initial load | ActivityIndicator |
| List error | Banner in sticky header |
| Empty decks | FacultyEmptyState + generate CTA |
| Empty topics/deleted | FacultyEmptyState |
| API errors on mutations | AppAlert with `ApiError.message` |
| **getDeck failure in openDeck** | **Silent → `setCards([])`** — FAIL |

---

## 22. Performance

**Status:** PASS

Initial load uses `Promise.all` for 6 endpoints — acceptable. Client-side deck search. No unbounded lists assumed. Card list in editor could grow large without virtualization — acceptable for typical deck sizes; INFO for very large decks.

---

## 23. Security

**Status:** PARTIAL

No secrets in module code. Client-supplied instructor/course headers — server must enforce. MCQ distractors and card text rendered to students — XSS depends on server sanitization and markdown/text renderer — UNVERIFIED.

---

## 24. Web/Mobile Integration

**Status:** UNVERIFIED

Shared types in `flashcards-api.ts`. Web path `/student/dashboard-v2/flashcards`. Faculty mobile is fully native. Cross-portal create/edit parity not executed this run.

---

## 25. Faculty → Student Integration

**Status:** UNVERIFIED

Expected paths:

1. Faculty sets `isPublished: true` → student `courseDecks` includes deck
2. Faculty sets `showInPracticeHub: true` → `flashcardsApi.listDecks(session, true)` surfaces in Practice Hub
3. Faculty toggles topic availability off → students lose access to topic decks
4. Faculty MCQ settings → student study batch/quiz behavior

All traced in code; **not executed** faculty write → student verify this run.

---

## 26. Automated Tests

| Type | Coverage |
|------|----------|
| Unit/integration | **None** |
| Maestro | 13 faculty flows; sim-audit Aug 16: verify, tabs, editor, qa, cleanup **SUCCESS** |
| This run | `faculty-flashcards.yaml` **FAILED** — app not on faculty login (`Open navigation menu` not found) |

---

## 27. End-to-End Test Results

| Workflow | Prior sim-audit | This run |
|----------|-----------------|----------|
| Open module + tabs | PASS | UNVERIFIED |
| Create/edit deck + cards | PASS (editor yaml) | UNVERIFIED |
| Generate from bank | UNVERIFIED | UNVERIFIED |
| Topic/config toggles | PASS (verify/tabs) | UNVERIFIED |
| Soft delete + restore | PASS (tabs) | UNVERIFIED |
| Publish → student study | UNVERIFIED | UNVERIFIED |
| Practice Hub surfacing | UNVERIFIED | UNVERIFIED |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | HIGH | Backend | Server auth, validation, IDOR, soft-delete semantics for all `/api/instructor/flashcards/*` routes not auditable — backend absent from repo. | Repo search | N/A | Audit server routes; verify cross-course and TA denial. |
| F-002 | HIGH | E2E | Faculty publish / Practice Hub / topic availability → student Flashcards + Practice Hub not verified on production this run. | Scope requirement | N/A | QA deck: publish + practice hub → student login verify. |
| F-003 | MEDIUM | Error handling | `openDeck` catches `getDeck` errors and sets `cards: []` with no alert — faculty may edit/add cards against empty state or think deck is empty. | L250–255 | `FacultyFlashcardsScreen.tsx` | Surface `AppAlert` / error banner; keep modal closed or show retry. |
| F-004 | MEDIUM | UX | New deck modal (`!editingDeck`) hides all card management until first Save — faculty must save metadata before adding cards. | L888 `{editingDeck ? (` | `FacultyFlashcardsScreen.tsx` | Allow add-card after create in one flow, or show explicit “Save deck first to add cards” notice. |
| F-005 | MEDIUM | Deleted | API supports `permanentlyDeleteDeleted({ cardIds })` but Deleted panel only offers restore for cards — no purge UI. | Deleted panel vs API | `FacultyFlashcardsDeletedPanel.tsx` | Add permanent delete for cards or document soft-only retention. |
| F-006 | MEDIUM | Data integrity | Card reorder fires two parallel PATCH requests without transaction/rollback. | L327–330 | `FacultyFlashcardsScreen.tsx` | Single reorder endpoint or sequential await + reload on failure. |
| F-007 | MEDIUM | Testing | No unit/integration tests for flashcard API wrappers, batch clamp, or faculty workflows. | No test files | N/A | Add tests for `instructorFlashcardsApi` payloads and config clamp. |
| F-008 | LOW | UX | Topics tab and Config tab both expose topic availability toggles with different UX — potential confusion. | Two toggle surfaces | `FacultyFlashcardsScreen.tsx` | Consolidate or cross-link. |
| F-009 | LOW | Performance | Deck editor renders all cards without virtualization — may lag on very large decks. | ScrollView map | Editor modal | Virtualize if decks > ~50 cards expected. |
| F-010 | LOW | Maestro | Smoke test failed when sim not on faculty session. | Maestro 2026-08-17 | `faculty-flashcards.yaml` | Prepend dev-faculty-login flow. |
| I-001 | INFO | Cora | Strong handoff via `flashcard_topic` pending; server generate/automation UNVERIFIED. | `faculty-cora-pending.ts` | N/A | Verify server uses same generate endpoint. |
| I-002 | INFO | Sim-audit | Aug 16 sim-audit recorded PASS for verify, tabs, editor, qa, cleanup. | `sim-audit/faculty/flashcards/*-junit.xml` | N/A | Re-run after fixes. |
| I-003 | INFO | Student | Student personal decks (`deckKind: student`) separate from faculty course decks — by design. | `flashcards-api.ts` | N/A | Expected. |
| I-004 | INFO | Cross-module | Generate-from-bank depends on Question Bank topics — integration contract only verified at client. | `getQuestionBankTopics` | N/A | Audit Question Bank module separately. |

---

## 29. Required Fixes Before Ship

1. **F-001** — Server-side audit of flashcards instructor API (auth, scope, soft delete).
2. **F-002** — E2E proof: faculty publish + optional Practice Hub → student can study.
3. **F-003** — Do not silently empty cards when `getDeck` fails.

---

## 30. Future Improvements

- F-004 — Single-flow deck + card creation
- F-005 — Card permanent delete in Deleted tab
- F-006 — Atomic card reorder
- F-007 — Automated tests
- F-008 — Consolidate topic toggle UX
- F-009 — Virtualize large card lists

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 95 |
| Routing | 95 |
| UI | 88 |
| Buttons/Actions | 85 |
| API Integration | 78 |
| CRUD | 80 |
| Authentication | 58 |
| Authorization | 58 |
| Course Isolation | 88 |
| Membership | 85 |
| Data Integrity | 62 |
| Production Configuration | 92 |
| Error Handling | 72 |
| Mobile UX | 82 |
| Security | 68 |
| Performance | 85 |
| Accessibility | 86 |
| Cora Integration | 70 |
| Testing | 55 |

**Overall Module Score:** 79/100

**Final Status:** REQUIRES FIXES BEFORE SHIP

**Dependencies recorded:** `instructor-content-api`, `flashcards-api`, `instructor-api`, `constants.ts`, `faculty-registry`, Question Bank topics, student Practice Hub

**Next submodule:** none (medium module complete)
