# App Store Review — Demo Credentials

> **App Store Connect does not accept `.md` files.** Paste the block below into **App Review Information → Notes**, or upload `APP_STORE_REVIEW_CREDENTIALS.pdf` (same folder).

> Isolated sandbox for Apple App Review and beta testers.
> These accounts **do not** see live ELEG 1304 / ECE 2202 student rosters.
> Course content (assessments, lectures, flashcards, notes, question bank) is cloned into demo courses owned by the review instructor.

**Last updated:** 2026-09-02

---

## Apple Review Student

| Field | Value |
|-------|-------|
| **Name** | Alex Rivera |
| **University** | University of Houston |
| **Email** | `alex.rivera@coursecollab.demo` (do **not** use for sign-in — see note) |
| **Student ID** | `910000001` |
| **Password** | `Review26!` |
| **MFA / 2FA** | Not required |
| **Password change** | Not required |

**Sign in:** Select **Student**, choose **University of Houston**, then sign in with **Student ID `910000001`** and password `Review26!`.

> **Email login:** Alex’s review email is shared by ECE + ELEG roster rows. Signing in with `alex.rivera@coursecollab.demo` asks you to **select a course**, then continues. Student IDs still work for a direct one-step login.

---

## Apple Review Instructor

| Field | Value |
|-------|-------|
| **Name** | Maya Chen |
| **Email** | `maya.chen@coursecollab.demo` |
| **Username / Instructor ID** | `mchen` |
| **Password** | `Review26!` |
| **Membership** | **Instructor Pro** (Manage Results, Student Progress, analytics unlocked) |
| **MFA / 2FA** | Not required |
| **Password change** | Not required |

**Sign in:** Select **Instructor**, then sign in with username **`mchen`** (or email `maya.chen@coursecollab.demo` in the same username field) and password `Review26!`.

---

## Apple Review Career Member

| Field | Value |
|-------|-------|
| **Name** | Test User |
| **Email** | `danieldoe33@gmail.com` |
| **Career Member ID** | `GUEST-dbac7af614bb47dd` |
| **Password** | `ELEG2026!` |
| **MFA / 2FA** | Not required |
| **Password change** | Not required |

**Sign in:** Select **Other Sign In Options → Career Member**, then sign in with **email** `danieldoe33@gmail.com` and password `ELEG2026!` (the Career Member ID is not accepted in the email field).

---

## Copy/paste block (App Store Connect → App Review Information)

```
Apple Review Student

Name: Alex Rivera
University: University of Houston
Student ID: 910000001
Password: Review26!
MFA / 2FA: Not required
Password Change: Not required

Sign In: Select Student → University of Houston → enter Student ID 910000001 (not email) and password Review26!.
Note: Email login with `alex.rivera@coursecollab.demo` shows a course picker (ECE + ELEG). Student IDs sign in directly.

Apple Review Instructor

Name: Maya Chen
Email: maya.chen@coursecollab.demo
Username / Instructor ID: mchen
Password: Review26!
MFA / 2FA: Not required
Password Change: Not required

Sign In: Select Instructor → username mchen (or maya.chen@coursecollab.demo) + password Review26!.

Apple Review Career Member

Name: Test User
Email: danieldoe33@gmail.com
Career Member ID: GUEST-dbac7af614bb47dd
Password: ELEG2026!
MFA / 2FA: Not required
Password Change: Not required

Sign In: Select Other Sign In Options → Career Member → email danieldoe33@gmail.com + password ELEG2026!.

── NOT IN SCOPE FOR REVIEW ──
Summer Camp sign-in shows “Coming soon” — intentional for this release.

── AI (Cora) ──
Student/faculty/career AI features call our production API; demo accounts have sandbox context only.
Privacy: Settings → Privacy & Security → Cora privacy.

── PAYMENTS (iOS) ──
The iOS app does NOT process payments of any kind. No Apple IAP, no Apple Pay / PassKit, no Stripe Payment Sheet, and no in-app links to web checkout for memberships or Cora credits. Purchase / upgrade buttons are hidden on iOS; checkout routes redirect to read-only account screens. Users may view existing plan tier and credit balance synced from course-collab.com. New purchases are completed independently on the website (Guideline 3.1.1 reader / account-management model).

── PAYMENTS (Android) ──
Membership and Cora credits may use native Stripe Payment Sheet (Google Pay supported).

── APPLE PAY / PASSKIT ──
Removed. This build has no Apple Pay merchant entitlement and no PassKit usage.

── ACCOUNT DELETION ──
Settings → Privacy & Security → Delete account (in-app flow).
```

**Suggested username field (primary account):** `910000001` or `alex.rivera@coursecollab.demo` (Student · University of Houston)

---

## Supplementary reference

### University

- **University of Houston** (id `2`)

### Instructor demo courses

| Code | Title | Course id | Session | Session id |
|------|-------|-----------|---------|------------|
| ELEG1304 | ELEG 1304 (Review Demo) | `15` | `ELEG1304P01` | `496` |
| ECE2202 | ECE 2202 (Review Demo) | `16` | `ECE2202` | `497` |

Prefer **ECE 2202** for the richest student demo (quizzes, lectures, flashcards, notes).

### Alternate student ID (same person, ELEG enrollment)

| Field | Value |
|-------|-------|
| Student ID (ELEG 1304) | `910100001` |
| Password | `Review26!` |

### Summer Camp (not in scope for mobile review)

| Field | Value |
|-------|-------|
| Email | `danieldoe33@gmail.com` |
| Student ID | `CAMP-A1C75A3981A7` |
| Password | `CAMP2026!` |
| Mobile | Coming soon — gated until camp opens |

### Classmates (dummy students on demo courses)

Same password `Review26!` for all. Visible to the review instructor only.

| Name | Student IDs | Password |
|------|-------------|----------|
| Jordan Lee | `910000002` (ECE) / `910100002` (ELEG) | `Review26!` |
| Sam Patel | `910000003` (ECE) / `910100003` (ELEG) | `Review26!` |
| Casey Nguyen | `910000004` (ECE) / `910100004` (ELEG) | `Review26!` |
| Riley Brooks | `910000005` (ECE) / `910100005` (ELEG) | `Review26!` |
| Morgan Ellis | `910000006` (ECE) / `910100006` (ELEG) | `Review26!` |
| Avery Quinn | `910000007` (ECE) / `910100007` (ELEG) | `Review26!` |
| Cameron Blake | `910000008` (ECE) / `910100008` (ELEG) | `Review26!` |
| Taylor Kim | `910000009` (ECE) / `910100009` (ELEG) | `Review26!` |
| Jamie Ortiz | `910000010` (ECE) / `910100010` (ELEG) | `Review26!` |
| Drew Hanson | `910000011` (ECE) / `910100011` (ELEG) | `Review26!` |

### Web login URLs

| Portal | URL |
|--------|-----|
| Student | https://course-collab.com/auth/student |
| Faculty | https://course-collab.com/faculty/login |
| Career Member | https://course-collab.com/student/login/guest |

### Re-provision

From the web app repo (`v0-coursecollabv3`):

```bash
npx tsx scripts/seed-app-store-review-sandbox.ts
# wipe + re-clone content:
npx tsx scripts/seed-app-store-review-sandbox.ts --force-reclone
```

Canonical constants: `lib/app-store-review-accounts.ts`

This file is mirrored at `docs/APP_STORE_REVIEW_CREDENTIALS.md`.
