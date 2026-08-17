# Report Bug — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T21:00:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Bug report form + admin System Logs downstream  
**Module size:** SMALL — shared FacultySupportFormScreen factory

---

## Module identification

```
MODULE: Report Bug
MOBILE ROUTE: /module/report-bug
REGISTRY ENTRY: report-bug → supportFormModule("bug")
NAVIGATION GROUP: Support
PRIMARY SCREEN: FacultySupportFormScreen (kind="bug")
RELATED API ROUTES:
  - POST /api/instructor/support-tickets (category=bug)
  - GET  /api/instructor/support-tickets?category=bug
RELATED SERVICES: instructor-admin-api.ts → logSupportTicketToSystemLog (admin)
RELATED CORA TOOLS: None dedicated
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 83/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 2 |

Native form with module picker (required client-side), subject, repro details, New/History tabs. Production smoke **PASS**: POST created ticket + GET returned 5 history items (`test-support-modules-api.mjs` 10/10).

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | MEDIUM | TAs blocked by backend (403) — mobile does not hide module or show message | Hide for TA role or add TA submit path |
| F-002 | LOW | Server does not require moduleId for category=bug (client does) | Enforce moduleId server-side for bug category |
| F-003 | LOW | No maxLength on subject/message fields | Add client + server caps |
| F-004 | INFO | Header-only auth (systemic) | Session middleware long-term |

---

## 31. Final Scorecard

**Overall Module Score:** 83/100  
**Final Status:** READY TO SHIP  
**Commit:** 92687573a061e19da18406411c6ab0ab681e95c0  
**Production audit:** `expo/scripts/test-support-modules-api.mjs` PASS
