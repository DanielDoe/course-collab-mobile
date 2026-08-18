# Trade Center — Student Mobile Production Audit

```
MODULE: Trade Center
STUDENT ROUTE: /module/trade-center
NAVIGATION GROUP: Performance & Rewards. student-nav id trade-center, label Trade Center, icon storefront-outline. No minTier / locked.
FACULTY ROUTE: /module/trade-center
FACULTY NAVIGATION GROUP: Students. faculty-nav id trade-center, label Trade Center, icon storefront-outline. No minTier.
REGISTRY ENTRY: faculty-registry trade-center → FacultyTradeCenterScreen; student registry trade-center → TradeCenterModuleScreen → TradeCenterScreen
PRIMARY SCREEN: expo/src/components/faculty/FacultyTradeCenterScreen.tsx
RELATED SCREENS:
  - FacultyTradeCenterPanels.tsx (overview, conversion rules, analytics, donations, trade log, rollover, activity settings)
  - FacultyTradeCenterActionSheet.tsx
  - FacultyTradeCenterDonationActionSheet.tsx
  - FacultyTradeCenterTraderSheet.tsx
  - FacultyTradeCenterRolloverActionSheet.tsx
  - Student: expo/src/components/rewards/TradeCenterScreen.tsx
SUBROUTES: none under /module/trade-center
API ROUTES (faculty):
  GET  /api/trade-center/analytics
  GET  /api/trade-center/point-requests?role=instructor&includeReviewed=true
  GET  /api/trade-center/donation-requests?role=instructor&includeReviewed=true
  GET  /api/trade-center/config?session=
  POST /api/trade-center/config
  GET  /api/trade-center/instructor-trade-log
  GET  /api/instructor/trade-center/rollover-trades
  GET  /api/trade-center/export?report=
  POST /api/trade-center/donation-requests/:id/approve|reject
  POST /api/trade-center/point-requests/:id/approve-instructor|reject-instructor
API ROUTES (student / downstream):
  GET  /api/trade-center/points?studentId=&session=
  GET  /api/trade-center/my-history?studentId=
  GET  /api/trade-center/peers?session=&excludeId=
  GET  /api/trade-center/donation-requests?studentId=
  GET  /api/trade-center/point-requests?studentId=
  POST /api/trade-center/trade
  POST /api/trade-center/donate
  POST /api/trade-center/donation-requests
  POST /api/trade-center/point-requests
  POST /api/trade-center/point-requests/:id/approve-peer|reject-peer
  POST /api/trade-center/sync
  GET  /api/trade-center/classroom-transfer-eligibility?studentId=&session=
  GET/POST /api/trade-center/points-for-rollover
  GET/POST /api/trade-center/points-for-extra-attempts
SERVICES: instructor-api.ts get/save Trade Center*; rewards-api.ts; faculty-trade-center-utils.ts
DATABASE MODELS: Not in mobile repo. Inferred from v0-coursecollabv3: trade_center_config, student_activity_points, trade_transactions, donation_requests, point_requests, engagement_credits, grade_rollover_trades, grade_extra_attempt_trades, classroom_points
MEMBERSHIP: Unlocked (Free / Scholar). Intended. Assessment redemptions gated by course governance (`tradeCenterRedemptions=false` on review ECE).
CORA INTEGRATION: faculty capabilities trade.managePerks / manageRedemptions / manageRules; denied change_conversion_rules / change_balances_directly. Student denied same. No tool implementations.
FACULTY DEPENDENCY: Faculty Expo Trade Center is the governance surface. Config and approve/reject change student `canTrade`, caps, and balances.
ADMIN DEPENDENCY: none observed
WEB DEPENDENCY: MODULE_WEB_PATHS trade-center → /student/dashboard-v2/trade-center
```

Size: MEDIUM  
Audited: 2026-08-18  
Commit: `dba7f46`  
Production API: `https://coursecollab.vercel.app`

Invocation named **student-mobile-module-audit** / **Trade Center**. Scope is Faculty Expo/mobile Trade Center plus required backend and student Rewards Trade Center downstream.

Execution: production HTTPS with Alex ECE `910000001` / db `722`, Jordan `910000002` / db `723`, ELEG `910100001` / db `734`, faculty `mchen` / instructor `15`, course `16`. Simulator UI / theme: **UNVERIFIED**. Database rows: **UNVERIFIED** except via API responses. Did **not** complete a successful trade, community donate, config save, or live approve (one already-approved donation `28` exists). Unauth `POST /sync` returned **200** and is treated as a live write.

Prior faculty report `expo/docs/audits/faculty-mobile/trade-center.md` claimed READY 86 and marked F-001–F-003 **Fixed** because routes now require `x-student-id`. Rejected. Header-only identity is not authentication. `audit-trade-center-production.mjs` treats live **200/404** as PASS (`pending deploy`). Faculty status set to `REVALIDATION_REQUIRED`.

---

## Executive Summary

Readiness: **BLOCKED BY SECURITY / DATA ISSUE**  
Score: **47/100**  
Blockers: 0 (no local-only ship-stop; server must change)  
Critical: 4  
High: 4  
Medium: 3  
Low: 3

Faculty Expo Trade Center is a seven-tab governance hub. Instructor session routes (analytics, instructor request lists, config GET/POST with instructor cookie, trade log, rollover, export, instructor approve/reject) are **401** without a session and **403** on foreign course `1`. Cookie + course `16` analytics **200** (2 review students). Dev fixtures are `__DEV__`-gated.

**Ship is blocked on the student wallet and mutation surface.** Local `requireAuthenticatedStudentFromRequest` trusts `x-student-id` only. Production matches that code:

| Probe | Result |
|-------|--------|
| Unauth GET points/history/config/peers/instructor lists | **401** |
| Header-only `x-student-id:722` GET points | **200** wallet `131028` (Alex, 1 reading pt, lifetime EC 1) |
| Header-only GET peers `session=ECE2202` | **200** `peers=45` + roster ids |
| Alex cookie, no `x-student-id` | **401** (cookie is not identity) |
| Alex cookie + Jordan `x-student-id` | **200** Jordan wallet `131031` |
| Jordan cookie + Alex `x-student-id` | **200** Alex wallet + history |
| Unauth POST `/trade` `{studentId:722, pointsToTrade:999999}` | **400 Insufficient points to trade** |
| Unauth POST `/donate` `{studentId:722, pointsToDonate:1}` | **400 Minimum donation is 100 points** |
| Unauth POST `/sync` `{studentId:722, session:ECE2202}` | **200 `{success:true}`** — wrote sync |
| Unauth POST approve-peer / reject-peer id `999999` | **404 Request not found or already processed** |
| Unauth GET `points-for-rollover` / `points-for-extra-attempts` | **200** homework score **64.4** and category weights |

Faculty 401s do not make the module safe. Anyone who can set `x-student-id` or a numeric `studentId` body can read wallets and reach trade/donate/sync/peer-review handlers.

---

## Architecture

Faculty Drawer "Trade Center"
→ `/module/trade-center`
→ `FacultyTradeCenterScreen`
  → `useFacultyScope` + `instructorRequest` (cookies + MFA + refresh, fail closed)
  → loadCore: analytics + config + donation/point-requests
  → lazy: instructor-trade-log, rollover-trades
  → Config / Activity Settings → `saveTradeCenterConfig` POST
  → Donations panel → approve/reject donation or point request
  → Action sheet → refresh / jump tabs
  → `useNotificationModuleRefresh("trade-center")`

Student Drawer "Trade Center"
→ `/module/trade-center`
→ `TradeCenterScreen`
  → `rewardsApi` via `studentAuthenticatedRequest` (fail closed on the client)
  → points + history + point-requests; sync / trade / community donate / peer approve-reject
  → Does **not** call peers, create donation-request, or create point-request

Production `https://coursecollab.vercel.app`
→ Faculty: `requireInstructorSession` + `requireInstructorCourse`
→ Student reads: `requireAuthenticatedStudentFromRequest` (**header only**)
→ Student trade/donate/rollover writes: `requireStudentTradeAccess(body.studentId)` (**no session**)
→ Sync / peer approve-reject / classroom eligibility: **no auth helper**

---

## Files Inspected

| Area | Path |
|------|------|
| Faculty hub | `FacultyTradeCenterScreen.tsx`, `FacultyTradeCenterPanels.tsx` |
| Faculty sheets | `FacultyTradeCenterActionSheet.tsx`, `FacultyTradeCenterDonationActionSheet.tsx`, `FacultyTradeCenterTraderSheet.tsx`, `FacultyTradeCenterRolloverActionSheet.tsx` |
| Utils | `faculty-trade-center-utils.ts` (`__DEV__` fixture merges L399–563) |
| Student | `TradeCenterScreen.tsx`, `rewards-api.ts` |
| API clients | `instructor-api.ts` L3459–3546; `student-api.ts` session-proof |
| Nav / registry | `faculty-nav.ts` L105; `student-nav.ts` L98; `faculty-registry.tsx` L128; `registry.tsx` L65 |
| Meta / Cora / notify | `faculty-module-meta.ts` L283; `faculty-module-registry.ts` L519; `student-module-registry.ts` L354; `module-notification-registry.ts` |
| Backend (sibling) | `v0-coursecollabv3/lib/trade-center-student-access.ts`, `trade-center-request-auth.ts`, `app/api/trade-center/**` |
| Audit script | `expo/scripts/audit-trade-center-production.mjs` |
| Prior report | `expo/docs/audits/faculty-mobile/trade-center.md` (not trusted) |
| Maestro | `faculty-trade-center-decline-probe.yaml`, `faculty-deep-trade-center.yaml` |
| Unit tests | none for faculty Trade Center; `rewards-auth.contract.test.ts` only asserts client fail-closed |

---

## Navigation & Routing

**Status:** PASS

Faculty Students group and student Rewards group share `/module/trade-center` via portal-specific registries. Deep link `trade-center` mapped. Faculty missing-course empty state present. Student session required by `useSession`. Direct faculty/student swap of the same path does not load the other portal’s screen.

---

## Production Configuration

Production API verified: `https://coursecollab.vercel.app`  
Development URLs: none in Trade Center clients  
Mock dependencies: `mergeTradeCenterDevDonationFixtures` / point / rollover — `if (!__DEV__) return apiRows`. Production-safe.

---

## Screens

| Screen | Role | Status |
|--------|------|--------|
| FacultyTradeCenterScreen | Hub + tabs | ACTIVE. Code-traced. Sim **UNVERIFIED**. |
| Overview / analytics / log / rollover panels | Read | ACTIVE. Cookie faculty analytics 200. |
| Config / activity settings | Write config | ACTIVE. Unauth POST 401. Save E2E **UNVERIFIED** (would mutate live ALL config). |
| Donations panel + donation sheet | Approve/reject | ACTIVE. Unauth instructor approve 401. Fake id cookie approve **500**. Live approve not executed. |
| Student TradeCenterScreen | Wallet / trade / donate / requests / history | ACTIVE. Client fail-closed. Server header-only. Peer create UI missing. Search is top `CollabSearch`, not dock. |

---

## Components

| Component | Class |
|-----------|-------|
| Faculty sticky header + tab bar + dock `FacultySearchToolbar` | ACTIVE |
| Pending-request nudge banner | ACTIVE |
| Faculty action / donation / trader / rollover sheets | ACTIVE |
| Dev fixture merge helpers | ACTIVE in `__DEV__` only |
| Student `PillSwipeTabs` + `BalanceTile` + `RequestRow` | ACTIVE |
| Student peer picker / create-request form | **DEAD** on mobile (API client exists, screen never calls it) |
| Cora Trade Center tools | PLACEHOLDER (registry only) |

---

## Buttons

| Control | Location | Handler | Backend | Expected | Actual | Status |
|---------|----------|---------|---------|----------|--------|--------|
| Tabs | Faculty hub | `setTab` + lazy load | GET log/rollover | 401 unauth | 401 | PASS |
| Search | Faculty list tabs | client filter; rollover debounce | GET rollover | session | cookie 200; unauth 401 | PASS (traced) |
| Save config | Config / activity | `saveTradeCenterConfig` | POST config | session | unauth/header **401** | PASS (unauth). E2E UNVERIFIED |
| Approve/reject donation | Donations | instructor POST | approve/reject | session | unauth 401; cookie fake id **500** | PARTIAL |
| Approve/reject points | Donations | approve/reject-instructor | POST | session | unauth 401 | PASS (unauth) |
| Action sheet | + | refresh / jump | — | nav | traced | PASS |
| Pull refresh | Faculty | `refreshAll` | GETs | banner | traced | PASS |
| Student Trade | Trade tab | `tradePoints` | POST trade | session | unauth **400** handler | FAIL (TC2) |
| Student Donate | Donate tab | `donateToCommunity` | POST donate | session | unauth **400** handler | FAIL (TC2) |
| Student Sync | search trailing | `syncTradePoints` | POST sync | session | unauth **200** | FAIL (TC3) |
| Student peer approve/reject | Requests | approve/reject-peer | POST | session | unauth **404** handler | FAIL (TC3) |
| Student create peer donate/request | — | unused | POST requests | — | not in UI | MEDIUM (TC10) |

---

## Menus / Action Sheets

Faculty + sheet: Refresh, Review donations, Conversion rules, Activity settings. Navigation only. Traced.

Donation/point review sheet: approve confirm + reject reason. Instructor POST. Unauth 401. Live approve **UNVERIFIED**.

Student: no overflow sheet. Sync is the search trailing action.

---

## Modals

Faculty donation sheet resets reject reason on close. Approve confirm required. Android back / outside tap: **UNVERIFIED** (sim).

---

## Forms

| Form | Fields | Client | Server | Status |
|------|--------|--------|--------|--------|
| Conversion rules | weights, caps, toggles | `parseTradeCenterConfig` + pickers | `validateTradeCenterConfigInput` + unauth POST 401 | PARTIAL |
| Activity source toggles | practice/playground/reading enabled | same save | same | PARTIAL |
| Student trade amount | `NativeSelect` TRADE_CAP_OPTIONS | `amt > 0` | unauth reaches amount/balance checks | FAIL auth |
| Student donate amount | select | `amt >= min_donation_points` | same | FAIL auth |
| Reject reason | optional string | default copy | UNVERIFIED | UNVERIFIED |

---

## API Routes

| Method | Route | Caller | Authentication | Authorization | Membership | Course Scope | Status |
|--------|-------|--------|----------------|---------------|------------|--------------|--------|
| GET | `/api/trade-center/analytics` unauth / header-only | faculty | **401** | — | — | — | PASS |
| GET | same + faculty cookie + course 16 | faculty | **200** stats/topTraders | instructor session | Free | ECE | PASS |
| GET | same + cookie + course 1 | faculty | **403** Forbidden | course owner | — | IDOR | PASS |
| GET | same + student cookie + faculty headers | student | **401** | role | — | — | PASS |
| GET | instructor donation/point lists unauth | faculty | **401** | — | — | — | PASS |
| GET | instructor lists + cookie | faculty | **200** donations n=1 | session | — | ECE | PASS |
| GET | config unauth | both | **401** | — | — | — | PASS (unauth) |
| GET | config + `x-student-id` only | student | **200** full config | header | — | ALL | FAIL (TC1) |
| GET | config + faculty cookie | faculty | **200** | session | — | ALL | PASS |
| POST | config unauth / header-only | faculty | **401** | — | — | — | PASS |
| GET | instructor-trade-log / rollover / export unauth | faculty | **401** | — | — | — | PASS |
| GET | points/history/donations/point-requests unauth | student | **401** | — | — | — | PASS (unauth) |
| GET | same + `x-student-id` only | student | **200** wallet/history | header | — | ECE | FAIL (TC1) |
| GET | same + cookie only | student | **401** | cookie ignored | — | — | FAIL (TC1) |
| GET | Alex cookie + Jordan header | student | **200** Jordan wallet | spoof | — | — | FAIL (TC1) |
| GET | Jordan cookie + Alex header | student | **200** Alex wallet | IDOR | — | — | FAIL (TC1) |
| GET | peers + header | student | **200** n=45 roster ids | header | — | ECE | FAIL (TC1) |
| POST | trade / donate unauth | student | **400** business rule | none | — | — | FAIL (TC2) |
| POST | sync unauth | student | **200** success | none | — | — | FAIL (TC2) |
| POST | approve-peer / reject-peer unauth | student | **404** reached handler | body requesteeId | — | — | FAIL (TC3) |
| POST | donation/point-requests create + header | student | **400** min 100 | header | — | — | FAIL (TC5) |
| GET | classroom-transfer-eligibility unauth | — | **200** | none | — | — | FAIL (TC6) |
| GET | points-for-rollover / extra-attempts unauth | — | **200** grade cats | none | — | — | FAIL (TC4) |
| POST | points-for-rollover unauth | — | **403** governance | not 401 | — | — | FAIL (TC8) |
| POST | instructor approve donation unauth | faculty | **401** | — | — | — | PASS |
| POST | instructor approve id 999999 + cookie | faculty | **500** | session | — | — | FAIL (TC11) |

`role=instructor` is a query flag. Unauth instructor lists still 401. Server does not trust role alone.

---

## CRUD

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create student trade/donate | Yes | Client + server | Safe-amount probes only | FAIL auth |
| Create peer donation/point request | API yes; mobile UI no | API | Header 400 min points | FAIL auth / missing UI |
| Read faculty analytics/config/logs | Yes | Yes | Cookie 200 | PASS faculty |
| Read student wallet | Yes | Yes | Header 200; cookie 401 | FAIL |
| Update config | Yes | Yes | Unauth 401 | UNVERIFIED E2E |
| Approve/reject instructor | Yes | Yes | Unauth 401 | UNVERIFIED E2E |
| Delete | N/A | — | — | N/A |

---

## Authentication

**Status:** FAIL

Faculty instructor routes require a refresh/MFA session (`requireInstructorSession`). Header-only `x-instructor-id` is **401**. Cookie-only faculty analytics (cookie + `x-course-id`, no instructor header) is **200** — session is identity; header is optional bind. Correct.

Student Trade Center reads require `x-student-id` and **ignore cookies**. Cookie-only Alex is **401**. Header-only Alex is **200**. That is the inverse of the platform rule used by quizzes/grades/CodeBench (`requireBoundStudentCaller`).

Student trade/donate resolve `body.studentId` with `requireStudentTradeAccess` — existence + session membership only. No cookie. Unauth **400** is proof the handler ran.

Sync has no auth function. Unauth **200**.

---

## Student Authorization

**Status:** FAIL

Student cookie cannot call faculty analytics (**401**). Faculty cookie cannot call student points without `x-student-id` (**401**). Students cannot POST instructor config (**401**). Students cannot instructor-approve donations (**401**).

Students **can** (without a session): trade/donate if balances allow, sync any `studentId`, and reach peer approve/reject by `requesteeId`. Header-only students can create peer requests (400 only because 1 < min 100).

---

## Cross-Student Isolation

**Status:** FAIL

Jordan cookie + `x-student-id:722` returned Alex wallet and history **200**. Alex cookie + Jordan header returned Jordan wallet **200**. Header-only `x-student-id:723` returned Jordan wallet **200**. Peers leak 45 db ids + roster numbers (`2335526`, `910000007`, …) with `display_label:"Student"`.

Trade POST uses body `studentId`, not the header. Unauth `{studentId:723, pointsToTrade:999999}` returned **400 Insufficient points** — the server accepted Jordan as the actor with no session.

---

## Course / Section Isolation

Faculty analytics foreign course **403**. Config is session-query (`ALL` vs section) after instructor auth. Student `verifyStudentInSession` exists locally but is skipped when the caller never presents a session. Unauth rollover GET used `studentId=722&session=ECE2202` and returned ECE grade categories. ELEG cookie not separately listed for Trade Center this run.

---

## Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Free / Scholar | Unlocked | Unlocked | PASS (intended) |
| Explorer / Trailblazer | N/A | Assessment redemptions `tradeCenterRedemptions=false` | PASS (governance) |

No client `tier` / `isPremium` override observed on these routes.

---

## Security

**CRITICAL** header-only wallet/history/peers/config (TC1). **CRITICAL** unauth trade/donate/sync (TC2). **CRITICAL** unauth peer approve/reject (TC3). **CRITICAL** unauth rollover/extra-attempt GETs leak homework **64.4** and weights (TC4). Faculty instructor writes 401. Dev fixtures not shipped.

---

## Assessment Security

Not a take-engine module. `GET /api/trade-center/points-for-rollover` and `points-for-extra-attempts` are unauthenticated and return per-category gradebook scores and weights for the supplied `studentId`. That is answer-adjacent grade leakage. Mobile Trade Center does not call these routes; they are still in-scope backend.

---

## Cora Security

Registry deny `change_conversion_rules` / `change_balances_directly` on faculty and student. No tools. Live Cora isolation **UNVERIFIED**. PARTIAL.

---

## Database Integrity

Not in mobile repo. Unauth sync **200** wrote activity-point sync for `722` (wallet `updated_at` moved to `2026-08-18T03:22:53Z` during this audit). Trade/donate use row locks and ledger rollback on insert failure. Approve donation uses claim-then-transfer; fake id returned **500** not 404. Atomicity of live approve → balance **UNVERIFIED**.

---

## Files / Documents

Faculty export PDF requires instructor session (**401** unauth). No student file upload on this module.

---

## Notifications

Registry includes `trade-center`. Faculty and student screens subscribe `useNotificationModuleRefresh("trade-center")`. Push delivery **UNVERIFIED**.

---

## Mobile UX

Faculty: dock search on list tabs; config/activity correctly omit search; nudge + action sheet. **PASS** (code). Sim **UNVERIFIED**.

Student: `CollabSearch` stacked under the header, not `StudentSearchToolbar` `placement="dock"`. Peer donate/request from web is missing. **PARTIAL**.

---

## Theme

Faculty uses `NATIVE` + trade-center theme. Pending nudge uses icon + text. Student uses `NATIVE` + rewards theme. Sim / dark mode **UNVERIFIED**.

---

## Accessibility

Action sheet rows labeled. Faculty search trailing action labeled. Student request approve/reject icon buttons have no `accessibilityLabel`. LOW.

---

## Errors / Loading / Empty States

Faculty core error banner; per-tab spinners; empty panels; rollover search errors surface. Student load error box; empty history/requests. Faculty approve missing id **500** raw fail. Student has no offline-specific copy.

---

## Performance

Faculty lazy-loads trade log / rollover. Overview/analytics render full payloads in ScrollView. Student loads points+history+requests on mount. No FlashList. Acceptable for current review-course size.

---

## Web / Mobile Integration

Deep link mapped. Web peer donate/request exists (`rewards-api` comments cite web `trade-center-content`). Mobile student UI is community-donate + incoming point-request only. Parity **PARTIAL**.

---

## Faculty → Student Integration

Save config → student `tradingEnabled` / caps / `canTrade`. Approve donation `28` (Brandon → Kuhswin, 100 pts, already approved 2026-08-01) proves the path existed. Live save/approve this run **UNVERIFIED**. Student can already read/mutate without faculty action if they know a numeric id.

---

## Tests

Maestro decline + deep flows exist. `audit:trade-center-production` **false-PASSes** 200/404. `rewards-auth.contract.test.ts` only checks the mobile client. No faculty utils unit tests. No server contract test in the mobile repo that fails header-only 200.

---

## End-to-End Results

| Step | Result |
|------|--------|
| Faculty login `mchen` → analytics/config/log/rollover | 200 |
| Faculty foreign course analytics | 403 |
| Faculty unauth / header-only instructor GETs | 401 |
| Student header-only wallet | 200 Alex / Jordan |
| Student cookie-only wallet | 401 |
| Cross-student header spoof | 200 |
| Unauth trade/donate | 400 handler |
| Unauth sync | 200 write |
| Faculty config save / live approve | Not executed |
| Student successful trade/donate | Not executed |
| Simulator | UNVERIFIED |

---

## Security Attack Results

| Attack | Result |
|--------|--------|
| Missing session student reads | 401 |
| Header-only `x-student-id` | **200** wallet/history/peers/config |
| Cookie-only student | **401** |
| Change studentId via header while holding another cookie | **200** victim wallet |
| Unauth trade/donate body studentId | **400** handler (would 200 if funded) |
| Unauth sync | **200** |
| Unauth peer approve/reject | **404** handler |
| Call faculty endpoint as student | 401 |
| Faculty header-only | 401 |
| Faculty foreign course | 403 |
| Unauth grade-perk GETs | **200** scores |
| Membership spoof | N/A unlocked |
| Replay / duplicate trade | idempotencyKey exists; unauth still reaches it |

---

## Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| TC1 | CRITICAL | Auth / isolation | Student reads accept `x-student-id` as identity and ignore cookies. Cross-student header spoof returns the victim wallet. | Prod: header 722 → 200 wallet `131028`; Alex cookie + Jordan header → 200 `131031`; Jordan cookie + Alex header → 200 Alex history; cookie-only → 401. Peers header → 45 roster ids. | `v0-coursecollabv3/lib/trade-center-student-access.ts` `requireAuthenticatedStudentFromRequest`; points/my-history/peers/donation-requests/point-requests/config GET | Replace with `requireBoundStudentCaller`. 401 without refresh/MFA; 403 on claimed-id mismatch. Never treat header as auth. |
| TC2 | CRITICAL | Auth / integrity | POST trade, donate, and sync do not require a session. Sync writes. Trade/donate run balance logic. | Prod unauth trade 400 "Insufficient points"; donate 400 "Minimum donation is 100"; sync **200 success**. Local `trade/route.ts` L34, `donate/route.ts` L26, `sync/route.ts` no auth. | `app/api/trade-center/trade/route.ts`, `donate/route.ts`, `sync/route.ts` | Gate with `requireBoundStudentCaller` + session check. Ignore body studentId except as a must-match claim. |
| TC3 | CRITICAL | Auth | Peer approve/reject trust body `requesteeId` only. | Prod unauth approve-peer/reject-peer **404** "already processed". Local routes have no session helper. | `point-requests/[id]/approve-peer/route.ts`, `reject-peer/route.ts` | Bind requestee to session student. 401 without session; 403 if not the requestee. |
| TC4 | CRITICAL | Privacy / grades | Unauth GET rollover and extra-attempt quote APIs return grade category scores and weights. | Prod unauth 200; homework `score:64.4` `weight:20`. | `points-for-rollover/route.ts`, `points-for-extra-attempts/route.ts` | `requireBoundStudentCaller`. Do not return gradebook categories to anonymous callers. |
| TC5 | HIGH | Auth | Header-only POST donation-requests / point-requests reaches validation (not 401). | Prod header create → 400 minimum 100. Local uses `requireAuthenticatedStudentTradeAccess` (header). | `donation-requests/route.ts` POST, `point-requests/route.ts` POST | Session bind via `requireBoundStudentCaller`. |
| TC6 | HIGH | Auth | `classroom-transfer-eligibility` has no auth. | Prod unauth 200 `{approvedTotal:0,tradable:0,minReserve:200}`. | `classroom-transfer-eligibility/route.ts` | `requireBoundStudentCaller`; claimed studentId must match. |
| TC7 | HIGH | Tests | `audit-trade-center-production.mjs` treats 200/404 as PASS (`pending deploy`). | Script L37–47 `expectDenied`. | `expo/scripts/audit-trade-center-production.mjs` | Fail on 200/404. Cookie E2E + header-only must be 401. Match `audit-analytics-more-production.mjs`. |
| TC8 | HIGH | Auth | Unauth POST points-for-rollover reached governance, not auth. | Prod **403** "redemptions are not enabled" (`courseGovernanceBlocked`). | `points-for-rollover/route.ts` POST | Session first; 401 before governance. |
| TC9 | MEDIUM | Mobile UX | Student search is top `CollabSearch`, not dock. | `TradeCenterScreen.tsx` L585. Faculty dock is correct. | `TradeCenterScreen.tsx` | `StudentSearchToolbar` `placement="dock"`. |
| TC10 | MEDIUM | Parity | Mobile student cannot create peer donations/requests; `rewardsApi` methods unused. | Screen load() only points/history/point-requests. Web has peers tab. | `TradeCenterScreen.tsx`, `rewards-api.ts` L324–388 | Add peer picker + create flows **after** TC1/TC5, or hide dead API. Do not ship create against header-only auth. |
| TC11 | MEDIUM | Errors | Faculty approve missing donation returns 500. | Cookie POST `/donation-requests/999999/approve` → 500 "Failed to approve donation". | `donation-requests/[id]/approve/route.ts` | 404 when no pending in-scope row; do not throw. |
| TC12 | LOW | Testing | No faculty Trade Center unit tests; client contract does not fail header-only server. | `package.json` test list; `rewards-auth.contract.test.ts` | expo tests + v0 route tests | Add auth contract tests that assert `requireBoundStudentCaller`. |
| TC13 | LOW | Cora | Capabilities declared; no tools. Isolation is registry-deny only. | faculty/student module registries | cora registries | Keep deny; do not add configure tools without confirm + session. |
| TC14 | LOW | Docs | Prior faculty READY 86 is invalid. | `trade-center.md` findings table says Fixed; script false-PASS | `expo/docs/audits/faculty-mobile/trade-center.md` | `REVALIDATION_REQUIRED` until TC1–TC8 re-probed 401. |

---

## Required Before Ship

1. **TC1** — Student Trade Center GETs must use session proof (`requireBoundStudentCaller`). Header-only and cookie+foreign-header must be 401/403.
2. **TC2** — trade / donate / sync must require the caller’s session. Unauth must be 401, not 400/200.
3. **TC3** — peer approve/reject must require the requestee’s session.
4. **TC4** — rollover / extra-attempt GETs must not return grades anonymously.
5. **TC5–TC8** — remaining student writes and eligibility GETs must 401 without a session. Replace the dishonest production audit script.

Do not treat faculty instructor 401s as sufficient. Do not mark `x-student-id` required as a fix.

---

## Future Improvements

FlashList on long logs; Cora configure-with-confirm after server bind; student peer UI after auth; a11y labels on approve/reject icons.

---

## Scorecard

| Area | Score |
|------|------:|
| Navigation | 90 |
| Routing | 88 |
| UI | 76 |
| Buttons | 68 |
| API | 32 |
| CRUD | 40 |
| Authentication | 18 |
| Authorization | 28 |
| Student Isolation | 12 |
| Course Isolation | 70 |
| Membership | 88 |
| Production Configuration | 90 |
| Data Integrity | 40 |
| Security | 16 |
| Assessment Security | 22 |
| Cora Security | 52 |
| Error Handling | 66 |
| Mobile UX | 72 |
| Performance | 80 |
| Accessibility | 76 |
| Testing | 22 |

OVERALL SCORE: 47/100

FINAL STATUS: BLOCKED BY SECURITY / DATA ISSUE

Audited at: 2026-08-18T03:25:00.000Z

Commit: `dba7f46`

Dependencies recorded: instructor-api, rewards-api, faculty-trade-center-utils, FacultyTradeCenterScreen, TradeCenterScreen, faculty-nav, student-nav, cora/faculty-module-registry, cora/student-module-registry, instructor-session-auth, trade-center-student-access, requireBoundStudentCaller, api/trade-center/*

---

## Registry entry

See `docs/audits/student-mobile/module-audit-status.json` key `trade-center`.
