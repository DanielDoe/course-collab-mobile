# Profile & Settings — Faculty Mobile Production Audit

**Audited at:** 2026-08-17T21:00:00.000Z  
**Audit mode:** Production Readiness  
**Scope:** Settings hub + profile/password/MFA + local prefs + membership link downstream  
**Module size:** MEDIUM — hub + modal sheets + sub-routes

---

## Module identification

```
MODULE: Profile & Settings
MOBILE ROUTE: /settings (+ /settings/appearance, /settings/cora-usage)
REGISTRY ENTRY: profile, settings → FacultySettingsHubScreen
NAVIGATION GROUP: Top-level (FACULTY_PROFILE_SETTINGS_LINK)
MEMBERSHIP REQUIREMENT: None
PRIMARY SCREEN: expo/src/components/faculty/FacultySettingsHubScreen.tsx
RELATED SCREENS: FacultySettingsSheets.tsx, AppearanceSettingsScreen, CoraUsageHistoryScreen
RELATED API ROUTES:
  - GET/PUT /api/instructor/profile?instructorId=
  - POST    /api/instructor/change-password
  - GET/POST /api/auth/mfa/* (status, enroll, disable)
RELATED SERVICES: instructor-api.ts, faculty-settings-preferences.ts (SecureStore), mfa-api.ts
RELATED CORA TOOLS: None dedicated
RELATED WEB MODULE: /instructor/dashboard-v2/settings/profile
```

---

## 1. Executive Summary

**Readiness:** REQUIRES FIXES BEFORE SHIP

**Score:** 79/100

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 1 |
| Medium | 2 |
| Low | 2 |

Native Settings-style hub with grouped sections (Account, Workspace, Preferences), modal sheets for profile/security/notifications, MFA card, sign-out. Production probe: unauthenticated `GET /api/instructor/profile?instructorId=15` → **200** (IDOR).

**Proven:** Route wiring; native grouped UI; MFA uses proper auth flow.  
**Not proven:** Push notification toggles affect delivery (prefs are device-local SecureStore only).

---

## 28. Findings

| ID | Severity | Finding | Recommended Fix |
|----|----------|---------|-----------------|
| F-001 | CRITICAL | IDOR on profile GET/PUT — any caller with `instructorId` can read/update another instructor | Session middleware; validate caller owns instructorId |
| F-002 | CRITICAL | Password change compares plaintext passwords on backend | Hash with bcrypt/argon2; migrate existing rows |
| F-003 | HIGH | Notification preferences device-local only — not synced server-side | Persist to backend or document limitation |
| F-004 | MEDIUM | Honorific title stored in SecureStore only — lost on reinstall | Store in instructors table |
| F-005 | MEDIUM | Hub links to tier-locked modules without local gate | Acceptable if target screens gate; document |
| F-006 | LOW | Three entry routes (/settings, /module/profile, /module/settings) | Consolidate or document aliases |
| F-007 | LOW | Membership tier badge may be stale (broken refresh — see membership audit) | Fix membership refresh |

---

## 29. Required Fixes Before Ship

1. **F-001 / F-002** — Backend auth + password hashing before production.

---

## 31. Final Scorecard

**Overall Module Score:** 79/100  
**Final Status:** REQUIRES FIXES BEFORE SHIP  
**Commit:** 92687573a061e19da18406411c6ab0ab681e95c0
