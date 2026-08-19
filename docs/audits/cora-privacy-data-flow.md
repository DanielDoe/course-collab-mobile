# Cora Privacy Data Flow Audit

**Audit date:** August 18, 2026  
**Scope:** CourseCollab mobile client (`expo/`) + documented server behavior (`v0-coursecollabv3`)  
**Principle:** Minimum necessary data + purpose limitation + user control + transparent disclosure

---

## Architecture pipeline (client-enforced layer)

```
Application UI
  → Cora Tool / Agent request
  → Context selection (authorized CourseCollab APIs)
  → Data minimization (`cora-privacy-minimization.ts`)
  → PII redaction (`filterStudentContextForCora` / `redactProfileForExternalAi`)
  → HTTPS POST to CourseCollab API (session-authenticated)
  → [Server] RBAC + prompt assembly
  → [Server] Provider minimization (required — not in this repo)
  → External AI provider (OpenAI / Anthropic)
  → Response → CourseCollab storage → Client display
```

**Key files**

| Stage | File |
|-------|------|
| Minimization | `expo/src/lib/cora-privacy-minimization.ts` |
| Student context filter | `expo/src/lib/cora-rbac/context-policy.ts` |
| API payload | `expo/src/lib/ai-tutor-api.ts` |
| Prompt formatting | `expo/src/lib/format-student-context-for-prompt.ts` |
| Privacy controls | `expo/src/lib/cora-preferences-storage.ts` |
| Settings UI | `expo/src/components/ai-tutor/CoraPrivacyControls.tsx` |
| Audit hashing | `expo/src/lib/cora-rbac/audit.ts` |
| Log sanitization | `expo/src/lib/http.ts`, `expo/src/lib/system-log-client.ts` |

---

## Student Cora — verified client payload (after minimization)

| Data category | Selected for Cora | Removed / redacted before external AI | Sent externally (category) | Provider | Returned | Stored |
|---------------|-------------------|---------------------------------------|----------------------------|----------|----------|--------|
| Student name | Available in account | **Removed** (`fullName`) | Not sent in `studentContext` | — | — | Server account record only |
| Email | Available in profile | **Removed** (`redactProfileForExternalAi`) | Not sent | — | — | Server account record only |
| Student ID / code | Available in account | **Removed** (`studentCode`, `studentDbId`) | Not sent | — | — | Server auth only (`studentId` in API body for session binding — server-side, not model identifier) |
| Course / section | Yes | Kept (non-identifying enrollment context) | Course code, title, section | OpenAI / Anthropic via server | Chat text | Server conversation |
| Grades / scores | When `useLearningContext` enabled | Aggregated scores only; no identity | Percentages, assessment titles | Same | Feedback / study help | Server + gradebook |
| Struggling topics | When enabled | Topic labels only | e.g. "Kirchhoff's Laws" | Same | Personalized guidance | Server analytics |
| User message | Yes | User-typed (may contain PII if user types it) | Prompt text | Same | Response | Server conversation |
| Conversation history | Last 8 turns | Full text (user responsibility) | Recent turns | Same | Continuation | Server |
| Learning memory toggles | Device prefs | Flags only | `remember-gaps`, `detect-confusion` | Same | Behavior adjustment | Device + server |
| Privacy controls | Device prefs | Control flags | `privacyControls` object | Same | Context gating | Device |
| AI session ID | Generated client-side | Pseudonymous UUID | `aiSessionId` (non-identifying) | Same | Session routing | Ephemeral |
| Auth tokens | Session cookies | **Not in AI payload** | Not sent to provider | — | — | SecureStore / cookies |

### Privacy control matrix

| Control | Effect on payload |
|---------|-------------------|
| Personalized learning OFF | No `studentContext`; learning memory flags forced off |
| Use learning context OFF | No `studentContext` |
| Local learning memory OFF | `remember-gaps` / `detect-confusion` false |
| Instructor sharing | Preference sent to server; default OFF |

---

## Faculty Cora — client payload

| Data | Client sends | Notes |
|------|--------------|-------|
| Message + history | Yes | No roster/PII in client JSON body |
| Instructor ID | Header (`x-instructor-id`) | Server auth — not intended as model identifier |
| Teaching context | Built server-side | Client stores `instructorName` locally for UI only |
| Document ingest | Full file to server | Server must minimize before provider |

---

## Admin Cora — client payload

| Data | Client sends | Notes |
|------|--------------|-------|
| Message + history | Yes | No student roster in client body |
| Admin ID | Header | Server auth only |
| Institutional context | Server-built | Aggregated/pseudonymized preferred |

---

## AI Notetaker

| Stage | Data | Minimization |
|-------|------|--------------|
| Recording | Audio | Sent to server for transcription — disclosed in Privacy Policy |
| Live captions | Device preview | Not full transcript |
| Note chat | Note content + question | Server-side; follows Cora minimization principles |

---

## Logging audit

| Log sink | PII in logs | Mitigation |
|----------|-------------|------------|
| Cora client audit buffer | Hashed prompts only | `hashCoraText` — no full prompt storage |
| Mobile system log | Was: userName | **Fixed:** userName removed; userId role only |
| HTTP error sanitize | Partial | Expanded sensitive key list in `http.ts` |
| Server Cora logs | Unknown | **Backend action required** in `v0-coursecollabv3` |

---

## Storage map

| Data | Local device | CourseCollab server |
|------|--------------|---------------------|
| Cora privacy preferences | Yes (`cora-preferences-*.json`) | Not mirrored |
| Cora conversations | Cache (`ai-tutor-chats-*.json`) | Primary source |
| Grades / enrollment | No | Yes |
| Student context snapshot | SecureStore setup context | `/api/ai-tutor/student-context` |
| Learning memory toggles | Device file | Preference flags in chat API |

---

## Gaps requiring backend (`v0-coursecollabv3`)

These cannot be fully guaranteed from the mobile repo alone:

1. **Server-side PII strip before provider call** — client minimizes; server must re-minimize and never forward `studentId` as a provider user identifier.
2. **Session-bound auth** — replace header-only `x-student-id` spoofing on context/chat routes.
3. **Faculty/admin confirm actions** — require session cookies, not header-only IDs.
4. **Provider logging policy** — no full prompts in application logs.
5. **Account deletion purge** — remove Cora conversations on deletion.
6. **`privacyControls` server enforcement** — honor `useLearningContext: false` server-side even if legacy clients send context.

---

## Verification checklist

- [x] Names not in minimized `studentContext`
- [x] Emails not in minimized profile
- [x] Student codes / DB IDs not in minimized `studentContext`
- [x] Pseudonymous `aiSessionId` on chat requests
- [x] Privacy controls UI matches legal disclosures
- [x] All five local learning memory toggles match web API
- [x] Manage Cora Memory sheet with per-fact removal
- [x] Clear learning memory adds fact IDs to clearedMemoryIds (web behavior)
- [x] Client-side message PII sanitization before API send
- [x] Bundled legal copy aligned with v0-coursecollabv3/lib/compliance/legal-content.ts
- [x] Server privacy synced via GET/PUT /api/cora/privacy
- [x] Local vs server storage distinguished in disclosures
- [x] No absolute "AI never receives personal information" claim
- [x] Third-party providers disclosed (not "open source AI platforms")
- [ ] Server-side provider payload audit (external repo)
- [ ] Production auth hardening (external repo)

---

## Retention / deletion

| Data | Retention | User deletion |
|------|-----------|---------------|
| Device Cora prefs | Until cleared or app data removed | Clear learning memory toggle |
| Server conversations | Server policy | Account deletion (when API available) |
| Provider-side data | Provider terms | Provider account/data requests via CourseCollab |
