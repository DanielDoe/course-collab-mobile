# App Store Connect — Listing & Review Checklist

**App:** CourseCollab Mobile  
**ASC App ID:** `6803146932`  
**Bundle ID:** `com.coursecollab.app`  
**Current build:** 1.0.0 (12) — production IPA via EAS

Use this doc when the EAS submission finishes and the build appears in App Store Connect → **TestFlight** / **App Store** tab.

---

## Where to see your submission

| Portal | Path |
|--------|------|
| **Expo (EAS Submit queue)** | [expo.dev → course-collab-mobile → Submissions](https://expo.dev/accounts/danieldoe/projects/course-collab-mobile/submissions) — submission `a7970146-9894-4b0d-85e3-b7fb762cc70b` |
| **Expo (build artifact)** | [Build 5a134379](https://expo.dev/accounts/danieldoe/projects/course-collab-mobile/builds/5a134379-44f1-46c4-894f-485fdfd62cf1) |
| **App Store Connect (after processing)** | [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **CourseCollab Mobile** → **TestFlight** (build 12) or **App Store** → **iOS App** → version **1.0** |

Processing usually takes 5–30 minutes after EAS submission leaves the queue. You’ll get an email when Apple finishes processing the binary.

---

## Demo accounts for App Review (NOT auto-submitted)

`eas submit` uploads the IPA only. **You must paste review notes and credentials manually** in App Store Connect:

**App Store Connect → CourseCollab Mobile → App Store → iOS App 1.0 → App Review Information**

### Sign-in required
**Yes**

### Contact (use your real info)
- First name / Last name / Phone / Email — your reviewer contact details

### Notes (copy/paste)

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

Contact: danieldoe33@icloud.com for review questions.
```

**Suggested username field (primary):** `910000001` or `alex.rivera@coursecollab.demo` (Student · University of Houston)  
**Password:** `Review26!`

Full credential matrix: `expo/docs/APP_STORE_REVIEW_CREDENTIALS.md`

---

## App Information (General)

| Field | Value |
|-------|-------|
| **Name** | CourseCollab Mobile |
| **Subtitle** (30 chars max) | Courses, quizzes & AI tutor |
| **Primary category** | Education |
| **Secondary category** | Productivity |
| **Content rights** | Does not contain third-party content (or set appropriately if using licensed materials) |
| **Age rating** | Complete questionnaire — expect **12+** or **17+** if user-generated content / unrestricted web in Cora; answer social-media questions honestly |
| **Copyright** | © 2026 Daniel Doe (or your legal entity) |

### Promotional text (170 chars, optional)
```
Stay on top of lectures, quizzes, and deadlines. Cora AI helps you study—faculty manage courses from anywhere. Built for university learners.
```

### Description (copy/paste, edit as needed)

```
CourseCollab Mobile brings your courses, assessments, and campus tools into one native iOS app.

FOR STUDENTS
• See upcoming lectures, quizzes, and classroom points
• Take practice quizzes and view feedback
• Chat with Cora, your AI study assistant grounded in your course materials
• Manage your schedule and notifications

FOR FACULTY
• Roster, announcements, question bank, and office hours
• Classroom points and assessment results
• Cora copilot for teaching workflows (scoped to your courses)

FOR GUESTS
• Limited access for demo and trial experiences

Privacy-first: control Cora memory and data sharing in Settings. Account deletion available in-app.

Requires an account from your institution or a guest invite. Not a consumer social network.
```

### Keywords (100 chars max, comma-separated)
```
education,university,courses,quiz,lectures,student,faculty,learning,AI tutor,classroom
```

### Support URL
```
https://course-collab.com/support
```
(or your live support page)

### Marketing URL (optional)
```
https://course-collab.com
```

### Privacy Policy URL
```
https://course-collab.com/legal/privacy-policy
```
(verify live URL matches in-app legal screen)

---

## Screenshots (you must capture — not auto-generated)

Required sizes (6.7" iPhone — use iPhone 15 Pro Max simulator or device):

| # | Screen | Suggested caption |
|---|--------|-------------------|
| 1 | Student dashboard / home | Your courses at a glance |
| 2 | Quiz or assessment in progress | Practice and graded assessments |
| 3 | Cora AI tutor conversation | AI study help with course context |
| 4 | Faculty roster or announcements | Tools for instructors |
| 5 | Settings → Privacy / Cora controls | You control your data |
| 6 | Calendar or lectures (optional) | Never miss a class |

**iPad:** Required if `supportsTablet: true` in app.json — capture 12.9" iPad Pro screenshots.

Capture locally:
```bash
cd expo && npx expo run:ios --device "iPhone 16 Pro Max"
# Log in with review student 910000001 / Review26!
# Cmd+S in Simulator for screenshots
```

Upload in App Store Connect → **App Store** → **Screenshots** for each device size.

---

## App Privacy (Privacy Nutrition Labels)

Complete in App Store Connect → **App Privacy**. Source: `docs/privacy-data-inventory.md`

### Data linked to you (typical answers)

| Data type | Collected | Linked | Tracking | Purpose |
|-----------|-----------|--------|----------|---------|
| Name | Yes | Yes | No | App functionality, account |
| Email address | Yes | Yes | No | App functionality, account |
| User ID | Yes | Yes | No | App functionality |
| Other user content | Yes | Yes | No | App functionality (submissions, messages) |
| Photos/Videos | Optional | Yes | No | User uploads coursework |
| Audio | Optional | Yes | No | Notetaker / dictation |
| Calendar | Optional | Yes | No | Class schedule sync |
| Purchase history | Yes | Yes | No | Membership (Stripe) |
| Product interaction | Limited | Maybe | No | Analytics if enabled server-side |
| Crash data | Limited | Maybe | No | Diagnostics |

### Data used for tracking
**No** (unless you add ad/analytics SDKs that track across apps)

### Third-party data sharing (disclose)
- **OpenAI / Anthropic** — AI prompts/responses (via your server, not direct from app)
- **Stripe** — payment processing
- **Expo push** — notification delivery

---

## Export compliance

In App Store Connect → build → **Export Compliance**:

- App uses HTTPS only (ATS enforced)
- Select **Yes**, app uses encryption → **Exempt** (standard HTTPS/TLS only)  
  Matches `ITSAppUsesNonExemptEncryption = false` if set in Info.plist

---

## EU trader status (Digital Services Act)

App Store Connect → **Business** (or banner on Apps page):

1. Open **Agreements, Tax, and Banking** if prompted
2. Complete **Trader status** for EU distribution:
   - Individual developer → likely **Trader** if selling digital services (memberships/credits)
   - Provide address, contact, phone per form
3. Without this, EU App Store distribution may be blocked

---

## TestFlight → App Review submission checklist

- [ ] Build 11 (or latest) processed in TestFlight
- [ ] Screenshots uploaded (6.7" + iPad if applicable)
- [ ] Description, subtitle, keywords, URLs filled
- [ ] App Privacy questionnaire complete
- [ ] Age rating questionnaire complete
- [ ] App Review Information + demo credentials pasted
- [ ] Export compliance answered
- [ ] EU trader status complete
- [ ] Select build on version 1.0 → **Add for Review** → Submit

---

## EAS re-submit (after metadata ready)

```bash
cd expo
npm run build:ios      # after git push with lockfile fix
npm run submit:ios     # uploads latest build; metadata still manual in ASC
```
