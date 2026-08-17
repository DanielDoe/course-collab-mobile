# View Plans (Membership) — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T21:00:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Faculty membership hub + Stripe checkout + billing/manage sub-routes + tier refresh downstream  
**Module size:** MEDIUM — 5 native screens + payment sheet integration

---

## Module identification

```
MODULE: View Plans (Membership)
MOBILE ROUTE: /membership (+ /membership/checkout, /success, /manage, /cancel)
REGISTRY ENTRY: Top-level Expo routes (not faculty-registry); portal=faculty gate
NAVIGATION GROUP: Support (FACULTY_SUPPORT_GROUP)
MEMBERSHIP REQUIREMENT: N/A (this is the upgrade surface)
PRIMARY SCREEN: FacultyMembershipScreen
RELATED SCREENS:
  - FacultyMembershipCheckoutScreen
  - FacultyMembershipSuccessScreen
  - FacultyMembershipBillingScreen
  - FacultyMembershipCancelScreen
RELATED API ROUTES:
  - GET  /api/instructor/membership/plans (public)
  - GET  /api/instructor/membership?instructorId=
  - GET  /api/instructor/membership/details?instructorId=
  - POST /api/instructor/membership/mobile-payment-sheet
  - POST /api/instructor/membership/mobile-payment-intent
  - POST /api/instructor/membership/sync-stripe
  - GET  /api/instructor/membership/refresh?instructorId= (404 on live)
  - GET  /api/instructor/purchases?instructorId= (404 on live)
  - POST /api/membership/cancel (student-only — faculty calls this)
RELATED SERVICES:
  - faculty-membership-pricing-api.ts, faculty-membership-details-api.ts
  - faculty-membership-billing-api.ts, membership-payment-api.ts
  - faculty-shell-refresh.ts
RELATED CORA TOOLS: membership.explain (read-only)
RELATED WEB MODULE: /instructor/dashboard-v2/membership (web parity)
```

---

## 1. Executive Summary

**Readiness:** REQUIRES FIXES BEFORE SHIP

**Score:** 64/100

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 4 |
| Medium | 2 |
| Low | 2 |

Fully native five-screen flow with Stripe Payment Sheet checkout. Production probes: `plans` and `details` → 200; **`refresh` and `purchases` → 404** on live. Checkout path is implementable on dev client builds; billing/manage surfaces call dead or student-only APIs.

**Proven:** Nav → routes → native screens; plans pricing load; details GET; support forms unrelated.  
**Not proven:** End-to-end Stripe purchase on device (requires native Stripe build); webhook activation.

---

## 28. Findings

| ID | Severity | Finding | Evidence | Recommended Fix |
|----|----------|---------|----------|-----------------|
| F-001 | CRITICAL | `cancelMembership` / `reactivateMembership` call `/api/membership/{cancel,reactivate}` which require `studentId` | instructor-api.ts L3887–3897 | Add instructor cancel/reactivate routes or remove manage UI actions |
| F-002 | HIGH | `/api/instructor/purchases` → 404 on production — billing history always empty | Live curl 404 | Implement purchases endpoint or hide history tab |
| F-003 | HIGH | `/api/instructor/membership/refresh` → 404 — tier refresh in `faculty-shell-refresh.ts` fails silently | Live curl 404 | Add instructor refresh route or remove call |
| F-004 | HIGH | `syncFacultyMembershipFromStripe` searches Checkout Sessions, not Payment Intents — post-native sync often fails | sync-stripe route logic | Align sync with Payment Intent path; rely on webhook as primary |
| F-005 | HIGH | Manage UI shows subscription cancel when faculty product is one-time license | details API + billing screen | Simplify manage copy for one-time purchases |
| F-006 | CRITICAL | IDOR: membership/payment endpoints accept any `instructorId` without session proof | Header-only auth pattern | Session middleware on all `/api/instructor/membership/*` |
| F-007 | MEDIUM | Native checkout blocked in Expo Go without dev client rebuild | isStripeNativeAvailable() | Document App Review build requirement |
| F-008 | MEDIUM | Pricing fetch unauthenticated with constants fallback | faculty-membership-pricing-api.ts | Acceptable; monitor stale pricing |
| F-009 | LOW | Dead code: FacultyMembershipWebFlowScreen unused | — | Remove or wire |
| F-010 | LOW | Plan hero cards use shadow/bubble styling vs grouped-list guideline | UI review | Soften chrome |

---

## 29. Required Fixes Before Ship

1. **F-006** — Session-bound auth on membership APIs.
2. **F-001 / F-002 / F-003** — Fix or remove broken billing/manage/refresh paths.
3. **F-004 / F-005** — Align post-payment sync and manage UX with one-time faculty license model.

---

## 31. Final Scorecard

**Overall Module Score:** 64/100  
**Final Status:** REQUIRES FIXES BEFORE SHIP  
**Commit:** 92687573a061e19da18406411c6ab0ab681e95c0  
**Production probes:** plans 200, details 200, refresh 404, purchases 404
