# Submission Issues — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T20:30:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Read-only submission diagnostics + student quiz failure downstream

---

## Module identification

```
MODULE: Submission Issues
MOBILE ROUTE: /module/submission-issues
REGISTRY ENTRY: submission-issues → FacultySubmissionIssuesScreen
NAVIGATION GROUP: Administration
PRIMARY SCREEN: expo/src/components/faculty/admin/FacultySubmissionIssuesScreen.tsx
RELATED API ROUTES: GET /api/instructor/submission-diagnostics?days=N
RELATED CORA TOOLS: submissionIssue.diagnose, submissionIssue.resolve (no resolve API)
RELATED WEB MODULE: administration/submission-issues
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 80/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 1 |
| Info | 1 |

Native read-only diagnostics dashboard. Recent items open Manage Results. Cora no longer advertises a resolve capability that has no API. Meta no longer promises bulk resolve.

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | MEDIUM | **Fixed** — rows navigate to `/module/results` | FacultySubmissionIssuesScreen | — |
| F-002 | MEDIUM | **Fixed** — Cora capability is diagnose-only; resolve denied | faculty-module-registry.ts | — |
| F-003 | LOW | **Fixed** — meta lists triage / Open in Results | faculty-module-meta.ts | — |
| F-004 | LOW | No search/filter on recent items (web has student search) | Add inline search |
| F-005 | INFO | Also reachable from Settings hub | OK |

---

## 31. Final Scorecard

**Overall Module Score:** 80/100  
**Final Status:** READY TO SHIP  
**Remediated:** 2026-08-17
