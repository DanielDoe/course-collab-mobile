# Course Exchange — Faculty Mobile Production Audit

**Audited at:** 2026-08-19T13:50:00.000Z  
**Audit mode:** Production Readiness (parity pass)  
**Scope:** Faculty Expo Course Exchange module + `/api/instructor/course-exchange/*`

---

## Module identification

```
MODULE: Course Exchange
MOBILE ROUTE: /module/course-exchange (?tab=discover|received|sent|shared-with-me|my-shared|share-settings)
REGISTRY ENTRY: course-exchange → FacultyCourseExchangeScreen
NAVIGATION GROUP: Course (faculty-nav.ts, badgeKey: courseExchange, requiresManageCourseSettings)
PRIMARY SCREEN: expo/src/components/faculty/FacultyCourseExchangeScreen.tsx
RELATED API: expo/src/lib/instructor-api.ts (17 endpoints)
SHARED TYPES: expo/src/lib/course-exchange-shared.ts
MAESTRO: expo/maestro/faculty-course-exchange.yaml
CONTRACT TEST: expo/src/lib/course-exchange-auth.contract.test.ts
```

---

## Parity fixes (2026-08-19)

| Priority | Gap | Status |
|----------|-----|--------|
| P0 | Import retry on `FAILED` + `clone_error` display | Fixed |
| P0 | `supplement-options` API wired into supplement sheet | Fixed |
| P0 | `rejection_reason` display + optional reject reason | Fixed |
| P1 | Sync diff `yoursLabel` / `incomingLabel` | Fixed |
| P1 | `?tab=` deep link + notification route remap | Fixed |
| P1 | Provenance banner in Course Settings | Fixed |
| P1 | Reject reason prompt before decline | Fixed |
| P2 | `manage_course_settings` nav gate (staff_role proxy) | Fixed |
| P2 | Discover list/grid toggle | Fixed |
| P2 | Drawer `courseExchange` badge | Fixed |

---

## Final status

**Overall Module Score:** 82/100  
**Final Status:** READY WITH MINOR FIXES  
**Notes:** Server-side TA permission enforcement remains UNVERIFIED (backend not in repo). Client gate uses `staff_role` (`ta`, `teaching_assistant`, `assistant` hidden).
