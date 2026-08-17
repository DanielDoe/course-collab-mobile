# Help Center — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T21:00:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Static instructor support guides + deep links to faculty modules  
**Module size:** SMALL — single screen, no API

---

## Module identification

```
MODULE: Help Center
MOBILE ROUTE: /module/help-center
REGISTRY ENTRY: help-center → FacultyHelpCenterScreen
NAVIGATION GROUP: Support
PRIMARY SCREEN: expo/src/components/faculty/FacultyHelpCenterScreen.tsx
RELATED DATA: expo/src/constants/support-guides.ts (30 articles, 7 categories)
RELATED API ROUTES: None (offline/static)
RELATED CORA TOOLS: help.read (risk READ)
RELATED WEB MODULE: Instructor help / support parity UNVERIFIED
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 88/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 2 |
| Info | 1 |

Native FAQ hub with category accordion, local search, quick actions to submit-ticket/report-bug/feature-requests/membership, and deep links to faculty modules. No backend dependency — production-safe.

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | LOW | Search stacked in sticky header vs Liquid Glass dock pattern | Move to FacultySearchToolbar placement="dock" |
| F-002 | LOW | No faculty Maestro E2E for help-center | Add maestro/faculty-help-center.yaml |
| F-003 | INFO | Content is static — updates require app release | Consider remote config long-term |

---

## 31. Final Scorecard

**Overall Module Score:** 88/100  
**Final Status:** READY TO SHIP  
**Commit:** 92687573a061e19da18406411c6ab0ab681e95c0
