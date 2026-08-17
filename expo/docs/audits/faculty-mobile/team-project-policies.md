# Team & Project Policies — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T20:30:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** project_policy + groups/projects student downstream enforcement

---

## Module identification

```
MODULE: Team & Project Policies
MOBILE ROUTE: /module/team-project-policies
REGISTRY ENTRY: team-project-policies → FacultyTeamProjectPoliciesScreen
NAVIGATION GROUP: Administration
PRIMARY SCREEN: expo/src/components/faculty/admin/FacultyTeamProjectPoliciesScreen.tsx
RELATED API ROUTES: GET/PATCH /api/instructor/courses/policies (project_policy)
RELATED CORA TOOLS: projectPolicy.read, projectPolicy.update (Cora restricted)
RELATED WEB MODULE: administration/team-project-policies
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP

**Score:** 86/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 0 |
| Info | 1 |

Native three-tab editor. `project_policy` now gates student self-form on group create/join and enforces max team size on create/add-member/join. Project create enforces min/max team size. Peer-review weight is disabled when peer review is off.

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | HIGH | **Fixed** — self-form + team size on groups create/join/add-member; min/max on project create | project-policy-enforcement.ts | Late penalty / peer-review grade weight still display-only |
| F-002 | MEDIUM | Header-only instructor auth (systemic) | Session/JWT long-term |
| F-003 | LOW | **Fixed** — peer review weight disabled when required is off | FacultyTeamProjectPoliciesScreen | — |
| F-004 | INFO | Cora restricted from mutating by design | Document |

---

## 29. Required Fixes Before Ship

Create/join/size enforcement shipped. Remaining: late-penalty and peer-review weight in grade calculation (follow-up).

---

## 31. Final Scorecard

**Overall Module Score:** 86/100  
**Final Status:** READY TO SHIP  
**Remediated:** 2026-08-17
