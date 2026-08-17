# App Store Review — Demo Credentials

> Isolated sandbox for Apple App Review and beta testers.
> These accounts **do not** see live ELEG 1304 / ECE 2202 student rosters.
> Course content (assessments, lectures, flashcards, notes, question bank) is cloned into demo courses owned by the review instructor.

**Last provisioned:** 2026-08-14T18:07:38.032Z

## Shared password (faculty + all students)

```
Review26!
```

- MFA / 2FA: **disabled** (`mfa_bypass=true`)
- First login: **password change required** (`has_changed_password=false`), then continue to dashboard
- Membership: **Free** (faculty) / **Scholar** (students) — use Membership & Plans to test Stripe upgrades

## University

- **University of Houston** (id `2`)
- Use this university on student login (web + mobile)

## Faculty (instructor)

| Field | Value |
|-------|-------|
| Name | Maya Chen |
| Username | `mchen` |
| Email | `maya.chen@coursecollab.demo` |
| Password | `Review26!` |
| Instructor id | `15` |
| Web login | https://course-collab.com/faculty/login |

Demo courses owned by this instructor:

| Code | Title | Course id | Session | Session id |
|------|-------|-----------|---------|------------|
| ELEG1304 | ELEG 1304 (Review Demo) | `15` | `ELEG1304P01` | `496` |
| ECE2202 | ECE 2202 (Review Demo) | `16` | `ECE2202` | `497` |

## Primary student (give this to Apple)

Prefer **ECE 2202** for the richest demo (quizzes, lectures, flashcards, notes).

| Field | Value |
|-------|-------|
| Full name | Alex Rivera |
| Student ID (ECE 2202) | `910000001` |
| Student ID (ELEG 1304) | `910100001` |
| Password | `Review26!` |
| Email | `alex.rivera@coursecollab.demo` |
| Web login | https://course-collab.com/auth/student |

> Platform requires a unique `student_id` per enrollment, so ECE and ELEG use paired IDs for the same fictional person.

## Guest (platform guest)

| Field | Value |
|-------|-------|
| Display name | Test User |
| Email | `danieldoe33@gmail.com` |
| Student ID | `GUEST-dbac7af614bb47dd` |
| Password | `ELEG2026!` |
| First login | **password change required** (`has_changed_password=false`) |
| Web login | https://course-collab.com/student/login/guest |
| Mobile | Other sign-in options → Guest → email + password above |

## Summer Camp

| Field | Value |
|-------|-------|
| Name | Daniel Doe |
| Email | `danieldoe33@gmail.com` |
| Student ID | `CAMP-A1C75A3981A7` |
| Password | `CAMP2026!` |
| First login | **password change required** (`has_changed_password=false`) |
| Web | Summer Camp login (or student summer portal) with email + password above |
| Mobile | Coming soon — Summer Camp sign-in is gated on the app until camp opens |

> Guest and summer camp bcrypt hashes are verified against the passwords above. Same email is intentional — portals are separate accounts.

## Classmates (10 dummy students on each demo course)

Same password for all. Visible to the review instructor on demo courses only.

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

## Mobile app

1. Point the Expo app at production (or staging) API as usual.
2. Student: University of Houston → Student ID `910000001` → password `Review26!`.
3. Faculty: username `mchen` → password `Review26!`.
4. Guest: Other sign-in → Guest → `danieldoe33@gmail.com` / `ELEG2026!`.
5. Summer Camp: Other sign-in → Summer shows a Coming Soon screen (camper login is not open in this release).
6. Guest accounts require a first-login password change before the dashboard.

## Re-provision

From the web app repo (`v0-coursecollabv3`):

```bash
npx tsx scripts/seed-app-store-review-sandbox.ts
# wipe + re-clone content:
npx tsx scripts/seed-app-store-review-sandbox.ts --force-reclone
```

Canonical constants: `lib/app-store-review-accounts.ts`
This file is mirrored in the mobile repo at `docs/APP_STORE_REVIEW_CREDENTIALS.md` and `expo/docs/APP_STORE_REVIEW_CREDENTIALS.md`.
