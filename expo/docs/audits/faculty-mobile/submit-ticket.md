# Submit Ticket — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T21:00:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Support ticket form + admin System Logs downstream  
**Module size:** SMALL — shared FacultySupportFormScreen factory

---

## Module identification

```
MODULE: Submit Ticket
MOBILE ROUTE: /module/submit-ticket
REGISTRY ENTRY: submit-ticket → supportFormModule("support")
NAVIGATION GROUP: Support
PRIMARY SCREEN: FacultySupportFormScreen (kind="support")
RELATED API ROUTES:
  - POST /api/instructor/support-tickets (category=support)
  - GET  /api/instructor/support-tickets?category=support
RELATED SERVICES: instructor-admin-api.ts
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 82/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 2 |

Native support form with optional module picker, priority default medium, course context from `useFacultyScope`, success sheet + history tab with status badges. Production smoke **PASS** (POST + GET 7 tickets).

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | MEDIUM | TAs blocked (403) — no mobile UX for TA role | Hide module or dedicated TA path |
| F-002 | LOW | No field length limits | Add maxLength caps |
| F-003 | LOW | Silent no-op if session null on submit | Guard with error toast |
| F-004 | INFO | Fallback POST to `/api/student/support-tickets` on 404 only (unauth) — not used on live | Harden student fallback route |

---

## 31. Final Scorecard

**Overall Module Score:** 82/100  
**Final Status:** READY TO SHIP  
**Commit:** 92687573a061e19da18406411c6ab0ab681e95c0  
**Production audit:** `expo/scripts/test-support-modules-api.mjs` PASS
