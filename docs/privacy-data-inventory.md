# CourseCollab Privacy Data Inventory

Internal inventory for Apple App Privacy questionnaire and GDPR-style disclosures. Values reflect the **Expo mobile client + production API** (`https://coursecollab.vercel.app`) as audited on 2026-08-18.

See also: [`docs/audits/cora-privacy-data-flow.md`](./audits/cora-privacy-data-flow.md)

## Architecture scope

| Layer | Location | Notes |
|-------|----------|-------|
| Mobile client | This repo (`expo/`) | Native RN app; no secrets in bundle |
| Backend / DB / AI / payments | `v0-coursecollabv3` (external) | Not audited in this pass — server-side deletion service required |

## Data categories

| Category | Collected | Purpose | Stored | Retention | Access | Third party | Linked to user | User can delete |
|----------|-----------|---------|--------|-----------|--------|-------------|----------------|-----------------|
| Name | Yes | Account profile, roster display | Postgres (server) | Account lifetime / institutional policy | User, instructors, admins per RBAC | No direct share | Yes | Via account deletion (server) |
| Email | Yes | Login, notifications, support | Postgres | Account lifetime | User, authorized staff | Email provider (transactional) | Yes | Via account deletion |
| Student / guest ID | Yes | Authentication, enrollment | Postgres | Account lifetime | User, course staff | No | Yes | Via account deletion |
| University affiliation | Yes | Login scope, roster | Postgres | Enrollment period | Institution staff | No | Yes | Partial — enrollment records may remain |
| Course enrollment | Yes | App functionality | Postgres | Term + institutional retention | Student, faculty, TA | No | Yes | Not fully deletable if academic record |
| Assignments / submissions | Yes | Grading workflow | Postgres + blob storage | Institutional / term policy | Student, faculty | Storage provider | Yes | Submission retention governed by institution |
| Quiz / exam responses | Yes | Assessment | Postgres | Institutional policy | Student, faculty | No | Yes | Academic retention may apply |
| Grades | Yes | Academic record | Postgres | Institutional policy | Student, faculty | No | Yes | Retained for legitimate academic use |
| Attendance | Yes | Course operations | Postgres | Term policy | Student, faculty | No | Yes | May be retained institutionally |
| Uploaded documents | Yes | Coursework, notes | Blob storage | Course / account policy | Authorized roles only | Storage provider | Yes | Deletable when user owns resource |
| AI conversations (Cora) | Yes | AI tutor / faculty copilot | Postgres (server) | Server retention policy | User + authorized admins | **OpenAI / Anthropic via server** | Yes | Requires server deletion workflow |
| AI prompts / tool context | Yes | Cora responses | Server logs + provider | Provider + server policy | RBAC-scoped | **AI providers** | Yes | Client minimizes PII; server deletion workflow required |
| Push notification tokens | Yes | Alerts | Postgres | Until logout/delete | User devices | Apple/Google push infra | Yes | Removed on logout/delete (client + server) |
| Device identifiers | Limited | Push (Expo token), MFA trust | SecureStore (local) + server | Session / trust window | User device | Expo push service | Yes | Cleared on logout |
| Analytics / crash | Limited | Diagnostics | Server logs if enabled | Ops policy | Admins | Possible monitoring vendor | Maybe | Per server policy |
| Subscription metadata | Yes | Membership entitlements | Stripe + Postgres | Financial retention | User, billing admins | **Stripe** | Yes | Cancelled subs retained for finance |
| Payment card data | No (client) | Checkout | **Stripe only** | PCI scope at Stripe | Stripe | Stripe | Via Stripe customer | N/A in app |
| IP / usage activity | Yes (server) | Security, rate limits | Server logs | Short / ops policy | Admins | Hosting (Vercel) | Maybe | Not user-facing |
| User-generated content | Yes | Discussions, messages, projects | Postgres + storage | Course policy | Course participants | No direct | Yes | Moderation + deletion rules vary |

## Cora AI map (mobile-visible)

| Feature | Provider (server-side) | Input | Output | Stored | User types |
|---------|------------------------|-------|--------|--------|------------|
| Student AI Tutor | OpenAI / Anthropic (routed server-side) | Prompts, approved course context, own submissions | Chat, study plans | Usage logs + conversations (server) | Student |
| Faculty Cora | Same | Course content, analytics scoped to instructor | Teaching assistance | Usage logs | Faculty |
| Admin Cora | Same | Institutional ops context | Admin assistance | Audit logs | Admin |
| Cora credits (guest) | Stripe + server ledger | Purchase metadata | Credit balance | Server | Guest |

Client RBAC guard: `expo/src/lib/cora-rbac/` — tool access filtered before requests; **server must enforce authorization before model context**.

Client privacy minimization: `expo/src/lib/cora-privacy-minimization.ts` — strips names, IDs, emails from `studentContext` before API send.

## Deletion policy (intended)

Personal profile data: delete or anonymize on confirmed account deletion.

Academic records created in institutional courses: retain where required; unlink from deleted identity where possible.

Financial records: retain Stripe/customer references per law.

Sessions/tokens: revoke on deletion.

**Blocker:** Production API returned **404** for `/api/*/account/delete` at audit time — backend service in `v0-coursecollabv3` required.

## Sign in with Apple

Mobile login is password-based (university, guest, faculty, summer). Third-party OAuth types exist in university records but are not exposed in mobile login UI. Sign in with Apple **not required today** unless other third-party sign-in is added to iOS without equivalent Apple option.

## Payments classification

| Item | Mechanism | Apple IAP required? |
|------|-----------|---------------------|
| Student membership (Scholar → Explorer → Trailblazer) | Stripe Payment Sheet / hosted checkout | **Review required** — digital features consumed in app |
| Faculty membership | Stripe | Institutional / web may apply |
| Guest Cora credits | Stripe | **Review required** if consumable digital credits |
| Institutional access | Not sold in iOS client | No |

No StoreKit / Restore Purchases implementation present.
