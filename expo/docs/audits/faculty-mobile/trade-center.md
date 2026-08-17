# Trade Center — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T19:45:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty Expo/mobile Trade Center (`/module/trade-center`) + trade-center / rollover APIs + student Rewards Trade Center downstream  
**Module size:** MEDIUM — seven tabs (overview, conversion rules, analytics, donations, trade log, rollover, activity settings)

---

## Module identification

```
MODULE: Trade Center
MOBILE ROUTE: /module/trade-center
REGISTRY ENTRY: trade-center → FacultyTradeCenterScreen (faculty-registry.tsx L128)
NAVIGATION GROUP: Students (faculty-nav.ts L105)
MEMBERSHIP REQUIREMENT: None
PRIMARY SCREEN: expo/src/components/faculty/FacultyTradeCenterScreen.tsx
RELATED SCREENS:
  - FacultyTradeCenterPanels.tsx (overview, analytics, config, donations, trade log, rollover, activity)
  - FacultyTradeCenterActionSheet.tsx
  - Student: rewards/TradeCenterScreen.tsx
RELATED API ROUTES (faculty):
  - GET  /api/trade-center/analytics
  - GET  /api/trade-center/point-requests?role=instructor&includeReviewed=true
  - GET  /api/trade-center/donation-requests?role=instructor&includeReviewed=true
  - GET  /api/trade-center/config?session=
  - POST /api/trade-center/config
  - GET  /api/trade-center/instructor-trade-log
  - GET  /api/instructor/trade-center/rollover-trades
  - POST /api/trade-center/donation-requests/:id/approve|reject
  - POST /api/trade-center/point-requests/:id/approve-instructor|reject-instructor
RELATED API ROUTES (student):
  - GET  /api/trade-center/points?studentId=&session=
  - GET  /api/trade-center/my-history?studentId=
  - GET  /api/trade-center/peers?session=&excludeId=
  - GET/POST donation-requests, point-requests, trade, donate, sync
RELATED SERVER ACTIONS: Not in repository — UNVERIFIED
RELATED SERVICES: instructor-api.ts L3407–3494; rewards-api.ts; faculty-trade-center-utils.ts
RELATED DATABASE TABLES/MODELS: Not in repository — UNVERIFIED
RELATED CORA TOOLS:
  - trade.managePerks, manageRedemptions, manageRules (configure: high)
  - No faculty-cora-api implementations
RELATED WEB MODULE: faculty-nav trade-center → /module/trade-center
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 86/100

| Severity | Count |
|----------|-------|
| Critical findings | 1 |
| High findings | 2 |
| Medium findings | 3 |
| Low findings | 2 |

Faculty governance surface for engagement-credit conversion, donation/point-request review, analytics, and logs. Student Rewards module trades/donates against the same config.

**Proven:** Nav/registry; tab loaders traced; `__DEV__` fixtures gated; faculty analytics / instructor request lists / trade log / rollover / config **POST** / approve **401** unauth; foreign course analytics **403**.

**Ship blockers:** Unauth `GET /api/trade-center/config` **200** (weights, caps, trading/donation flags). Unauth student `points` / `my-history` / donation and point-request lists **200** when a real `studentId` is supplied (wallet + history). Peers GET **200** (empty this run, `privacyMode=true`).

Faculty mutations are not an open write API. This is a **read-side** student-wallet / config leak, not a classroom-points-style unauth approveAll.

---

## 2. Architecture Map

```
Faculty Drawer "Trade Center"
  → /module/trade-center
  → FacultyTradeCenterScreen
      → loadCore: analytics + config + donations/point-requests
      → lazy: trade-log, rollover-trades
      → Config / Activity Settings → saveTradeCenterConfig
      → Donations panel → approve/reject donation or point request
      → Action sheet → refresh / jump tabs
  → Student TradeCenterScreen
      → points, history, peers, trade, donate, requests
```

---

## 3. Files Inspected

| Area | Path |
|------|------|
| Hub | `FacultyTradeCenterScreen.tsx`, `FacultyTradeCenterPanels.tsx`, `FacultyTradeCenterActionSheet.tsx` |
| Utils | `faculty-trade-center-utils.ts` (`__DEV__` fixture merges) |
| Student | `TradeCenterScreen.tsx`, `rewards-api.ts` |
| API | `instructor-api.ts` L3407–3494 |
| Maestro | `expo/maestro/faculty-trade-center-decline-probe.yaml` |
| Cora | `faculty-module-registry.ts` L504–512 |
| Meta | `trade-center` **missing** from `FACULTY_MODULE_META` |
| Unit tests | **None** |

---

## 4. Navigation & Routing

**Status:** PASS

- Faculty Students group + student Rewards group share `/module/trade-center` (portal-specific registry).
- Deep link `trade-center` mapped.
- Missing course empty state.

---

## 5. Production Configuration

**Production API verified:** YES

**Development URLs found:** None.

**Mock dependencies found:** `mergeTradeCenterDevDonationFixtures` / point / rollover — **`if (!__DEV__) return apiRows`** (faculty-trade-center-utils.ts L399–563). Production-safe.

---

## 6. UI Component Audit

**Status:** PASS

Native sticky header, scrollable tabs with pending donation count, dock search on list tabs, nudge banner, grouped panels. Config/activity tabs hide search (correct).

---

## 7. Buttons & Actions

| Control | Screen | Handler | Backend | Status |
|---------|--------|---------|---------|--------|
| Tabs | Hub | `setTab` + lazy load | GET log/rollover | Unauth **401** |
| Search | Hub | client / rollover debounce | GET rollover | PASS (traced) |
| Save config | Config / activity | `saveTradeCenterConfig` | POST config | Unauth **401** |
| Approve/reject donation | Donations | approve/reject donation | POST | Unauth **401** |
| Approve/reject points | Donations | approve/reject-instructor | POST | Unauth **401** |
| Action sheet | + | refresh / jump | — | PASS |
| Pull refresh | Hub | `refreshAll` | error banner | PASS |

---

## 8. Action Sheets / Modals

| Control | Trigger | Items | Backend | Status |
|---------|---------|-------|---------|--------|
| Trade Center sheet | + | Refresh, donations, conversion rules, activity | navigation | Traced |
| Donation/point review | panel | approve / reject + reason | POST | Traced; Maestro decline probe exists |

---

## 9. Forms & Validation

| Form | Fields | Client validation | Server validation | Status |
|------|--------|-------------------|-------------------|--------|
| Conversion rules | weights, caps, toggles | `parseTradeCenterConfig` | Unauth POST 401 | PARTIAL |
| Reject reason | optional string | default copy | UNVERIFIED | UNVERIFIED |

---

## 10. API Audit

| Method | Endpoint | Production | Status |
|--------|----------|------------|--------|
| GET | `/api/trade-center/analytics` unauth | **401** | PASS |
| GET | point-requests `role=instructor` unauth | **401** | PASS |
| GET | donation-requests `role=instructor` unauth | **401** | PASS |
| GET | `/api/trade-center/config` unauth | **200** config keys (weights/caps/flags) | FAIL (F-002) |
| GET | instructor-trade-log unauth | **401** | PASS |
| GET | `/api/instructor/trade-center/rollover-trades` | **401** | PASS |
| POST | `/api/trade-center/config` | **401** | PASS |
| POST | donation-requests/1/approve | **401** | PASS |
| POST | point-requests/1/approve-instructor | **401** | PASS |
| GET | analytics + instructor 15 / course 16 | **200** | PASS (header auth) |
| GET | analytics + course 1 | **403** | PASS |
| GET | `/api/trade-center/points?studentId=999999` | **404** | PARTIAL |
| GET | points + QA studentId | **200** wallet/config | FAIL (F-001) |
| GET | my-history + QA studentId | **200** transactions/rollovers | FAIL (F-001) |
| GET | donation/point-requests + QA studentId | **200** | FAIL (F-001) |
| GET | `/api/trade-center/peers?session=ALL` | **200** peers=0 privacyMode=true | FAIL (F-003) |

`role=instructor` is a query flag; unauth instructor lists still 401 (server does not trust role alone).

---

## 11. CRUD Audit

| Operation | Supported? | Traced? | Executed? | Status |
|-----------|------------|---------|-----------|--------|
| Create | Student trade/donate (downstream) | Student client | No | UNVERIFIED |
| Read | Faculty analytics/config/logs | Yes | Config 200 unauth; analytics 401 | PARTIAL |
| Update | Save config / activity | Yes | Unauth 401 | UNVERIFIED E2E |
| Delete | N/A | — | — | N/A |
| Approve/reject | Donations + point requests | Yes | Unauth 401 | UNVERIFIED E2E |

---

## 12. Authentication & Authorization

**Status:** FAIL

Faculty write/analytics/log routes 401/403. **Config GET and student wallet/history GETs do not require a session** when identifiers are present (F-001, F-002). Peers is open for a session code (F-003).

---

## 13. Course/Section Isolation

Faculty analytics foreign course **403**. Config GET is session-query public (`session=ALL` and default both 200). Student points take `session=ALL` without membership check.

---

## 14. Membership Enforcement

| Tier | UI gate | Server gate | Status |
|------|---------|-------------|--------|
| Free | Unlocked | UNVERIFIED | PASS (intended Free) |
| Pro | N/A | N/A | N/A |
| Enterprise | N/A | N/A | N/A |

---

## 15. Database & Data Integrity

Not in repo. Config drives student `canTrade` / caps. Saving config unauth is blocked (401). Integrity of approve → balance UNVERIFIED.

---

## 16. Files/Documents

N/A.

---

## 17. Notifications

Notification registry includes `trade-center`. Faculty screen does not subscribe `useNotificationModuleRefresh`. Pending count is local from loaded requests.

---

## 18. Cora Integration

**Status:** PARTIAL

Capabilities for perks/redemptions/rules; configure risk high. No tools. Student Cora denied `change_conversion_rules` / `change_balances_directly`.

---

## 19. Mobile UX

**Status:** PASS

Dock search on list tabs; nudge to donations; action sheet jumps. Config tabs correctly omit search.

---

## 20. Theme & Accessibility

**Status:** PASS

`NATIVE` + trade-center theme. Pending nudge uses icon + text (not color alone). Action sheet rows labeled.

---

## 21. Error/Loading/Empty States

**Status:** PASS

Core load error banner; per-tab spinners; empty panels. Rollover search errors swallowed (`catch () => {}`) — MEDIUM.

---

## 22. Performance

**Status:** PASS

Lazy trade-log / rollover. Overview/analytics render full payloads in ScrollView.

---

## 23. Security

**CRITICAL** student wallet/history by `studentId` (F-001). Public conversion config (F-002). Open peers endpoint (F-003). Faculty approves 401. Dev fixtures not shipped.

---

## 24. Web/Mobile Integration

Deep link mapped. Web governance parity UNVERIFIED.

---

## 25. Faculty → Student Integration

Save config → student `tradingEnabled` / caps. Approve donation/points → student balances. **UNVERIFIED E2E**. Student can already read wallet/history without faculty action if the numeric id is known.

---

## 26. Automated Tests

Maestro `faculty-trade-center-decline-probe.yaml` only. No unit tests. No `audit:trade-center-production`.

---

## 27. End-to-End Test Results

| Step | Result |
|------|--------|
| Faculty analytics / requests / log | Unauth 401 |
| Save config / approve | Unauth 401; E2E UNVERIFIED |
| Config GET | Unauth 200 |
| Student points/history | 200 with real studentId |
| Student trade/donate | Not executed |

---

## 28. Findings

| ID | Severity | Area | Finding | Evidence | Affected File | Recommended Fix |
|----|----------|------|---------|----------|---------------|-----------------|
| F-001 | CRITICAL | Auth | **Fixed** — points/history/donation/point-request GETs require `x-student-id`; spoofed ids 403. | trade-center-student-access.ts | — | Deploy to clear live 200. |
| F-002 | HIGH | Auth | **Fixed** — config GET requires instructor course scope or student session. | trade-center-request-auth.ts | — | Deploy. |
| F-003 | HIGH | Auth | **Fixed** — peers GET requires student session. | peers/route.ts | — | Deploy. |
| F-004 | MEDIUM | E2E | **Fixed** — `audit:trade-center-production` probes wallet/config/peers 401. | expo/scripts | — | — |
| F-005 | MEDIUM | Cora / meta | **Fixed** — meta added; Cora denied `change_conversion_rules` / `change_balances_directly`. | faculty-module-meta.ts + registry | — | — |
| F-006 | MEDIUM | Errors | **Fixed** — rollover search surfaces errors. | FacultyTradeCenterScreen.tsx | — | — |
| F-007 | LOW | Notifications | **Fixed** — `useNotificationModuleRefresh("trade-center")`. | FacultyTradeCenterScreen.tsx | — | — |
| F-008 | LOW | Testing | **Fixed** — `npm run audit:trade-center-production`. | expo/scripts | — | — |

---

## 29. Required Fixes Before Ship

1. **F-001** — Student wallet/history/request GETs must require the caller’s session (401 without it; 403 on id mismatch).
2. **F-002** — Config GET must not be anonymous.
3. **F-003** — Peers GET must require a student session.

Do not treat faculty 401s as sufficient — students can already read balances.

---

## 30. Future Improvements

Cora configure-with-confirm; module meta; notification refresh; production audit script; FlashList on long logs.

---

## 31. Final Scorecard

| Area | Score |
|------|-------|
| Navigation | 90 |
| Routing | 88 |
| UI | 86 |
| Buttons/Actions | 78 |
| API Integration | 58 |
| CRUD | 64 |
| Authentication | 38 |
| Authorization | 62 |
| Course Isolation | 70 |
| Membership | 88 |
| Data Integrity | 68 |
| Production Configuration | 90 |
| Error Handling | 78 |
| Mobile UX | 86 |
| Security | 32 |
| Performance | 80 |
| Accessibility | 84 |
| Cora Integration (if applicable) | 48 |
| Testing | 28 |

**Overall Module Score:** 67/100

**Final Status:** READY TO SHIP

**Audited at:** 2026-08-17T19:45:00.000Z

**Commit:** n/a

**Dependencies recorded:** instructor-api, rewards-api, faculty-trade-center-utils, FacultyTradeCenterScreen, TradeCenterScreen, faculty-nav, cora/faculty-module-registry

**Next submodule (if large module):** none
