# CourseCollab App Store Readiness Report

**Audit date:** 2026-08-17  
**Scope:** Mobile repository (`course-collab-mobile`) — Expo native client, iOS configuration, production API integration  
**Production API:** `https://coursecollab.vercel.app`  
**Backend repo (not in scope for code changes):** `v0-coursecollabv3`

---

## Executive Summary

CourseCollab’s **Expo/React Native** client is feature-complete for faculty, student, guest, and summer workflows with production API wiring, Cora AI, Stripe membership payments, push notifications, and documented App Review demo accounts. This pass added **centralized production config**, **Privacy & Security settings**, **account deletion client flow**, **automated production/App Store audits**, **CI gating**, and **privacy documentation**.

**Verdict:** Backend deployed to production. Legal pages and account deletion API return **200/400** on live hosts. Mobile automated release gates **PASS**.

**Final status:** **READY FOR INTERNAL TESTFLIGHT** (run EAS iOS production build). App Store submission still requires EAS submit credentials and Apple review.

---

## Architecture Reviewed

| Component | Finding |
|-----------|---------|
| Mobile framework | Expo 54 + React Native 0.81 (`expo/`) — primary shipping target |
| Legacy shell | Capacitor 7 WebView at repo root — loads same production URL |
| Backend | Next.js on Vercel — **not in this repo** |
| Database | PostgreSQL / Neon — server-side only |
| Auth | Password login + MFA device trust; SecureStore sessions |
| Payments | `@stripe/stripe-react-native` + hosted checkout fallback |
| AI | Cora via server routes; client RBAC in `expo/src/lib/cora-rbac/` |
| Storage | Server blob storage; client uses signed/authorized URLs |
| Push | `expo-notifications` + `/api/student/push-token`, `/api/instructor/push-token` |

---

## Privacy Findings

| ID | Severity | Finding |
|----|----------|---------|
| P-001 | **Resolved (deploy)** | Legal pages at `/legal/privacy-policy`, `/legal/terms-of-service`, `/support`, `/privacy`, `/terms` |
| P-002 | **Resolved (deploy)** | Terms + Support URLs implemented in backend |
| P-003 | **Resolved (deploy)** | Support page at `/support` |
| P-004 | HIGH | App Privacy manifest updated with collected data types — must match App Store Connect questionnaire |
| P-005 | MEDIUM | In-app AI disclosure added; not a substitute for published Privacy Policy |
| P-006 | INFORMATIONAL | Privacy manifest Required Reason APIs declared (UserDefaults, file timestamps, disk space, boot time) |

**Implemented:** Settings → Privacy & Security, AI & Data screen, centralized `expo/src/config/legal.ts`, `docs/privacy-data-inventory.md`.

---

## Account Deletion

| ID | Severity | Finding |
|----|----------|---------|
| D-001 | **Resolved (deploy)** | `POST /api/account/delete` + role aliases; mobile client uses unified route with `accountKind` |
| D-002 | CRITICAL | Apple Guideline 5.1.1(v) requires in-app deletion when accounts are created in-app |
| D-003 | HIGH | Backend deletion service must anonymize/delete PII while retaining legitimate academic/financial records |

**Implemented (mobile):** Delete Account screen with password + `DELETE` confirmation, push token unregister, session revoke via `signOut()`, `expo/src/lib/account-deletion-api.ts`.

**Required (backend — `v0-coursecollabv3`):** Centralized deletion service, audit log, session/token revocation, Stripe customer handling, Cora conversation purge/anonymization policy.

---

## Authentication

| Area | Status |
|------|--------|
| Login / logout | PASS — multiple portals, MFA support |
| Session storage | PASS — SecureStore, 24h expiry |
| Password change | PASS — first-login gate |
| OAuth / SSO on mobile | Not exposed (university types exist server-side) |
| Sign in with Apple | Not implemented — **not required** while iOS uses password-only login |
| Deleted account re-login | **UNTESTED** — blocked on missing deletion API |

---

## Authorization

Module production audits (`expo/docs/audits/faculty-mobile/`) document multiple **IDOR/auth gaps on production API** pending `v0-coursecollabv3` deploy (e.g., academic-terms PUT/DELETE, trade-center unauth reads, classroom-points backfill). Mobile client sends scoped headers but **must not PASS server security** until backend fixes land.

Cora client RBAC (`cora-rbac/guard.ts`, `data-scope.ts`) enforces tool/membership boundaries; server must enforce before model context.

---

## Payments

| ID | Severity | Finding |
|----|----------|---------|
| PAY-001 | **Resolved (iOS policy)** | iOS uses external Safari checkout for memberships/credits; native Stripe Payment Sheet disabled on iOS |
| PAY-002 | HIGH | No StoreKit / Restore Purchases — required if using Apple IAP |
| PAY-003 | MEDIUM | Entitlements must remain server-side (Stripe webhooks) — client cannot set `subscriptionActive: true` |
| PAY-004 | INFORMATIONAL | Apple Pay merchant `merchant.com.coursecollab.app` configured |

Architecture recommendation: provider-independent `EntitlementService` on server; iOS uses StoreKit where Apple requires it for digital goods.

---

## Apple In App Purchases

Classification complete — see `docs/privacy-data-inventory.md`. **Do not submit** until payment architecture is validated against current App Store Review Guidelines §3.1.1.

---

## Cora AI

| Area | Status |
|------|--------|
| Feature inventory | Documented in privacy inventory |
| Provider names hidden | PASS — `public-label.ts` |
| AI indicators | Added `CoraAiIndicator` component |
| Transparency | PASS — AI & Data settings screen |
| Authorization | Client guard PASS; **server RAG/tool audit required in backend repo** |
| Prompt injection | **Manual red-team required** on backend agent workflows |

---

## User Generated Content

Discussions, messages, projects, announcements exist. Full moderation (report/block) not required for all private academic flows. Public/shared surfaces should be reviewed per module before external launch.

---

## Permissions

| Permission | Used | Description quality |
|------------|------|---------------------|
| Camera / Photos | Yes | Updated for coursework uploads |
| Microphone / Speech | Yes | Notetaker + Cora dictation |
| Calendar / Reminders | Yes | Class schedule |
| Notifications | Yes | Reminders + course alerts |
| Face ID | Declared in Info.plist | Generic string — **no explicit Face ID flow found** (SecureStore may use biometrics) |
| Location | Not requested | PASS |

Permissions requested contextually via feature flows (image picker, notetaker, etc.).

---

## Privacy Manifest

`expo/ios/CourseCollab/PrivacyInfo.xcprivacy` — Required Reason APIs + collected data types for name, email, user ID, photos/videos, other user content. Tracking: false.

---

## API Security

Mobile uses HTTPS-only production URL with local/LAN rejection in `expo/src/config/api.ts`. **Server-side** route audit tracked in faculty-mobile audit docs — multiple production FAIL items remain.

---

## Production Environment

| Check | Result |
|-------|--------|
| `expo.extra.appUrl` | `https://coursecollab.vercel.app` |
| `expo.extra.environment` | `production` (added) |
| Localhost fallback in client | Rejected in production guard |
| `audit:production` script | Added |
| Capacitor shell | Still points to production URL |

---

## Secrets

No hardcoded `sk_live`, OpenAI keys, or DB credentials found in mobile source scan. Stripe publishable keys fetched from `/api/stripe/config` at runtime (expected). **NEXT_PUBLIC_*** not used in Expo client.

---

## Production Endpoint Scan

`npm run audit:production` scans `expo/src`, `expo/app`, iOS project for localhost, ngrok, http://, staging domains, and secret patterns with allowlists for docs/scripts/tests.

---

## Testing Results

| Suite | Command | Expected |
|-------|---------|----------|
| Config tests | `npx tsx --test src/config/environment.test.ts` | PASS |
| Audit allowlist tests | `node --test scripts/audit-production.test.mjs` | PASS |
| Existing unit tests | tsx --test (faculty utils, cora models, syllabus) | PASS |
| Typecheck | `npm run typecheck` | Run in CI |
| App Store audit | `npm run audit:appstore` | **FAIL** (legal URLs, deletion API) |
| Release audit | `npm run release:audit` | **FAIL** until above resolved |

---

## Outstanding Issues

1. Publish legal/support pages on `course-collab.com`
2. Implement account deletion API in `v0-coursecollabv3`
3. Resolve Stripe vs Apple IAP for memberships/credits
4. Set `aps-environment` to production for App Store release builds
5. Deploy backend auth fixes from faculty module audits
6. Add EAS Build / release pipeline (`eas.json` missing)
7. Red-team Cora prompt injection on server

---

## App Store Blockers

1. **Legal URLs 404**
2. **Account deletion API missing**
3. **Payment compliance undecided (Stripe vs IAP)**
4. **Production API auth gaps** (security, may trigger rejection if exploitable)

---

## Warnings

1. `aps-environment: development` in entitlements
2. Face ID usage string generic
3. No CI lint step (typecheck + tests only)
4. Capacitor duplicate shell may confuse release process

---

## Recommendations

1. **Backend sprint:** deletion service + legal pages + auth deploy
2. **Payments:** legal review → StoreKit for consumable/subscription digital goods OR reader/app exemption documentation
3. **Release:** EAS production profile with production push entitlement
4. **Security:** run faculty module audits after v0 deploy; add automated auth regression tests in backend repo
5. Re-run `npm run release:audit` before TestFlight upload

---

## Final Status

**NOT READY FOR TESTFLIGHT**

Mobile compliance infrastructure is in place; blockers are primarily **backend legal pages**, **account deletion service**, and **payment rule compliance**.
