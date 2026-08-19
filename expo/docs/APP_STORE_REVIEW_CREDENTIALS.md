# App Store Review — Demo Credentials

> Isolated sandbox for Apple App Review and beta testers.
> These accounts **do not** see live ELEG 1304 / ECE 2202 student rosters.
> Course content (assessments, lectures, flashcards, notes, question bank) is cloned into demo courses owned by the review instructor.

**Last updated:** 2026-08-19

---

## Apple Review Student

| Field | Value |
|-------|-------|
| **Name** | Alex Rivera |
| **University** | University of Houston |
| **Email** | `alex.rivera@coursecollab.demo` |
| **Student ID** | `910000001` |
| **Password** | `Review26!` |
| **MFA / 2FA** | Not required |
| **Password change** | Not required |

**Sign in:** Select **Student**, choose **University of Houston**, then sign in using either the email address or Student ID above with the provided password.

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

**Sign in:** Select **Instructor**, then sign in using either the email address or username above with the provided password.

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

**Sign in:** Select **Other Sign In Options → Career Member**, then sign in using either the email address or Career Member ID above with the provided password.

---

## Copy/paste block (App Store Connect → App Review Information)

```
Apple Review Student

Name: Alex Rivera
University: University of Houston
Email: alex.rivera@coursecollab.demo
Student ID: 910000001
Password: Review26!
MFA / 2FA: Not required
Password Change: Not required

Sign In: Select Student, choose University of Houston, then sign in using either the email address or Student ID above with the provided password.

Apple Review Instructor

Name: Maya Chen
Email: maya.chen@coursecollab.demo
Username / Instructor ID: mchen
Password: Review26!
MFA / 2FA: Not required
Password Change: Not required

Sign In: Select Instructor, then sign in using either the email address or username above with the provided password.

Apple Review Career Member

Name: Test User
Email: danieldoe33@gmail.com
Career Member ID: GUEST-dbac7af614bb47dd
Password: ELEG2026!
MFA / 2FA: Not required
Password Change: Not required

Sign In: Select Other Sign In Options → Career Member, then sign in using either the email address or Career Member ID above with the provided password.

── NOT IN SCOPE FOR REVIEW ──
Summer Camp sign-in shows “Coming soon” — intentional for this release.

── AI (Cora) ──
Student/faculty/career AI features call our production API; demo accounts have sandbox context only.
Privacy: Settings → Privacy & Security → Cora privacy.

── PAYMENTS ──
Membership upgrades use Stripe Payment Sheet. No Apple IAP (Guideline 3.1.3(b) multiplatform).

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
