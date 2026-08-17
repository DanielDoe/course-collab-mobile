# CourseCollab Mobile Production Readiness

Date: 2026-08-17  
Scope: CourseCollab Expo / React Native client (`expo/`)  
Evidence: `npm run typecheck`, `npm run test`, `npm run audit:production`, `npm run audit:ios`, `npm run audit:appstore`, `npm run release:audit`

## Architecture

```
Mobile (Expo) ──HTTPS──► Next.js API (v0-coursecollabv3) ──► Neon Postgres
                              │
                              ├── Cora (OpenAI / Anthropic) via server gateway
                              ├── Stripe (web checkout on iOS; Payment Sheet on Android)
                              ├── Vercel Blob
                              └── Expo push
```

Production API: `https://coursecollab.vercel.app` (`expo.extra.appUrl`)  
Bundle ID: `com.coursecollab.app`  
Sessions: `expo-secure-store`  
Cora: CourseCollab API only — no provider keys in the client

## Automated gates (this run)

| Command | Result |
|---|---|
| `cd expo && npm run typecheck` | PASS |
| `cd expo && npm run test` | PASS (41 tests) |
| `cd expo && npm run audit:production` | PASS (0 critical / 0 high) |
| `cd expo && npm run audit:ios` | PASS (0 critical / 0 high) |
| `cd expo && npm run audit:appstore` | PASS (live legal URLs 200; deletion routes protected) |
| `cd expo && npm run release:audit` | PASS (5/5 sections) |

## Implemented in this pass

- Production guard runs in release builds; `EXPO_PUBLIC_ENVIRONMENT` is honored
- Logout / account switch / deletion clear cookies, Cora local state, membership caches, playground locks, and push association
- Shared HTTPS + timeout + 401 session expiry + sanitized error logging
- WebView origin lock, deep-link host validation, notification links require a session
- Privacy & Security includes Account Security; deletion success only after HTTP confirmation
- iOS ATS local networking disabled; unused Reminders permission removed; associated domains declared
- `audit:ios`, `audit:mobile-production`, `release:audit:mobile`; EAS pre-install runs production + iOS audits

## Remaining gaps (not client-fixable here)

- No EAS `projectId` in `app.json` — Expo push tokens and EAS remote versioning need `eas init`
- `eas.json` submit still has `REPLACE_WITH_*` Apple credentials
- No signed IPA / TestFlight upload was produced in this session
- Associated domains require an `apple-app-site-association` file on the production hosts
- StoreKit is intentionally not implemented; iOS digital goods use external web checkout — App Review classification is manual
- Full IDOR / unreleased-assessment / Cora retrieval matrix was not penetration-tested in this pass

---

## CourseCollab Mobile Production Readiness

**Production Build:** NOT READY  
**Internal TestFlight:** NOT READY  
**External TestFlight:** NOT READY  
**App Store:** NOT READY  

### Blockers

- No EAS project ID linked in the Expo config (blocks reliable production push tokens and a reproducible EAS store build)
- EAS Submit Apple ID / ASC app ID / team ID are still placeholders
- No signed production IPA has been built or uploaded to App Store Connect
- Universal Links will not open the app until AASA is deployed on `coursecollab.vercel.app` and `course-collab.com`

### Critical

- None found in the client source scan (no embedded OpenAI/Anthropic/Stripe secret/DB credentials; no localhost/staging API in production paths)

### High

- App Review may reject iOS digital membership if they classify it as IAP and require StoreKit instead of external Safari checkout
- Device push registration can fail silently until `extra.eas.projectId` is set

### Medium

- Face ID usage string is injected by `expo-secure-store` even though the app does not present a biometric unlock
- Some satellite fetch helpers (messages / Cora stream clients) still use module-local `fetch` rather than the shared timeout wrapper
- Android native tree is not checked in; Play Store is out of this iOS release

### Low

- Repo-root Capacitor shell is leftover and is not the store client
- `LSMinimumSystemVersion` and Xcode deploy target are now aligned at 15.1

### Manual Verification Required

- `eas init` + production `eas build --profile production --platform ios` + TestFlight upload
- Confirm AASA at `https://coursecollab.vercel.app/.well-known/apple-app-site-association`
- App Review IAP vs Reader-app / external purchase classification
- Review-account walkthrough (faculty `mchen`, student `910000001`) on a clean install
- IDOR / unreleased assessment / answer key / Cora document retrieval against the shared API
- Push on a physical device after EAS project linkage
- Account deletion end-to-end on a disposable review account
