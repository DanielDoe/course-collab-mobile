# App Store Submission Checklist

Manual and automated items for CourseCollab iOS submission. Automated checks: `cd expo && npm run release:audit`.

## Apple Developer / App Store Connect

- [ ] Apple Developer membership active
- [ ] App Store Connect app record created
- [ ] Bundle ID `com.coursecollab.app` registered
- [ ] Distribution certificate configured
- [ ] App Store provisioning profile configured
- [ ] Push notification key configured; **set `aps-environment` to production** in release entitlements
- [ ] App icon finalized (`expo/assets/CourseCollab.icon`)
- [ ] Screenshots prepared (iPhone + iPad if supporting tablet)
- [ ] App description, subtitle, keywords prepared
- [ ] Support URL live — **`{API_BASE}/support`** after deploying `v0-coursecollabv3`
- [ ] Privacy Policy URL live — **`{API_BASE}/legal/privacy-policy`**
- [ ] Terms URL live — **`{API_BASE}/legal/terms-of-service`**
- [ ] App Privacy questionnaire completed (use `docs/privacy-data-inventory.md`)
- [ ] Age rating questionnaire completed
- [ ] Export compliance answered
- [ ] Content rights answered
- [ ] Subscription products — **confirm Apple IAP vs Stripe** with legal review before submission
- [ ] Subscription metadata completed (if using IAP)
- [ ] Review account created — see `expo/docs/APP_STORE_REVIEW_CREDENTIALS.md`
- [ ] Review notes prepared (demo student `910000001`, faculty `mchen`, password `Review26!`)
- [ ] TestFlight internal testing completed
- [ ] TestFlight external testing completed (optional)
- [ ] Production build uploaded (EAS or Xcode archive)
- [ ] Final build selected in App Store Connect
- [ ] App submitted for review

## Repository automated gates

- [ ] `npm run audit:production` passes
- [ ] `npm run audit:appstore` passes (will fail until legal URLs + deletion API exist)
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run release:audit` passes
- [ ] CI workflow `.github/workflows/app-store-audit.yml` green on `main`

## In-app compliance (mobile)

- [x] Settings → Privacy & Security
- [x] Privacy Policy / Terms links (centralized — URLs must resolve in production)
- [x] AI & Data disclosure screen
- [x] Delete Account client flow with reauthentication UI
- [ ] Delete Account server workflow deployed (backend — deploy `v0-coursecollabv3`)
- [x] Privacy manifest `PrivacyInfo.xcprivacy`
- [ ] Push entitlements production for release build

## Post-submission

- [ ] Monitor App Review messages
- [ ] Verify Stripe webhooks + membership sync in production
- [ ] Verify Cora AI availability for review account
- [ ] Confirm no staging banners / debug UI in release build
