# AI Assistant Settings — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T20:30:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** ai_tutor_settings + student Cora routing + Pro tier gate

---

## Module identification

```
MODULE: AI Assistant Settings
MOBILE ROUTE: /module/ai-assistant-settings
REGISTRY ENTRY: ai-assistant-settings → FacultyAiAssistantSettingsScreen
NAVIGATION GROUP: Administration
MEMBERSHIP REQUIREMENT: Pro (nav locked: true, minTier: "Pro")
PRIMARY SCREEN: expo/src/components/faculty/admin/FacultyAiAssistantSettingsScreen.tsx
RELATED API ROUTES: GET/POST /api/instructor/ai-tutor/settings
RELATED CORA TOOLS: coraPolicy.read, coraPolicy.update (minTier Pro)
RELATED WEB MODULE: administration/ai-assistant-settings (full hub with analytics)
```

---

## 1. Executive Summary

**Readiness:** READY TO SHIP (local; live until v0 deploy)

**Score:** 82/100

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 0 |

Native Availability / Response / Routing editor. GET/POST require course scope + Instructor Pro. Failures return 5xx. Student `/api/ai-tutor` refuses disabled tutor, blocks practice generation when off, and applies hint / step-by-step / code-example / length policy to the prompt and token cap. Screen wraps `FacultyAdminTierGate minTier="Pro"`.

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | HIGH | **Fixed** — student `/api/ai-tutor` loads course settings, 403 when tutor off, prompt + token cap | course-student-settings.ts, ai-tutor/route.ts | — |
| F-002 | HIGH | **Fixed** — POST catch returns 500 | settings/route.ts | — |
| F-003 | MEDIUM | **Fixed** — GET catch returns 500 | settings/route.ts | — |
| F-004 | MEDIUM | **Fixed** — Pro gate on GET/POST + `FacultyAdminTierGate` | settings/route.ts, FacultyAiAssistantSettingsScreen | — |
| F-005 | MEDIUM | Mobile lacks web analytics/conversations/struggles/copilot tabs | Documented parity gap | Phase 2 |
| F-006 | LOW | **Fixed** — child toggles disabled when tutor off | FacultyAiAssistantSettingsScreen | — |

---

## 29. Required Fixes Before Ship

Ship blockers remediated. Remaining: web analytics tabs (F-005).

---

## 31. Final Scorecard

**Overall Module Score:** 82/100  
**Final Status:** READY TO SHIP  
**Remediated:** 2026-08-17
