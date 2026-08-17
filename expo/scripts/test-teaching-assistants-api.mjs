#!/usr/bin/env node
/** Full Teaching Assistants CRUD + permissions smoke test (production). */

const API = "https://coursecollab.vercel.app"
const USER = "dmdoe"
const PASS = "dmdoe123"
const COURSE_ID = 7 // ECE2202

const stamp = Date.now()
const QA_USERNAME = `qa_ta_${stamp}`
const QA_EMAIL = `qa_ta_${stamp}@coursecollab.test`

async function req(path, { method = "GET", instructorId, body, query } = {}) {
  const q = query ? `?${new URLSearchParams(query).toString()}` : ""
  const res = await fetch(`${API}${path}${q}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(instructorId ? { "x-instructor-id": String(instructorId) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text.slice(0, 300) }
  }
  return { ok: res.ok, status: res.status, json }
}

async function main() {
  console.log(`TA CRUD test → ${API}\n`)

  const login = await req("/api/instructor/login", {
    method: "POST",
    body: { username: USER, password: PASS },
  })
  if (!login.ok) throw new Error(`login failed: ${login.status}`)
  const instructorId = login.json?.faculty?.id ?? login.json?.instructor?.id
  console.log(`✓ login instructor ${instructorId}`)

  const listBefore = await req("/api/instructor/teaching-assistants", { instructorId })
  console.log(listBefore.ok ? `✓ GET list (${listBefore.json?.tas?.length ?? 0})` : `✗ GET list ${listBefore.status}`)

  const create = await req("/api/instructor/teaching-assistants", {
    method: "POST",
    instructorId,
    body: {
      username: QA_USERNAME,
      email: QA_EMAIL,
      name: `QA TA ${stamp}`,
      password: "QaTaTest26!",
      course_ids: [COURSE_ID],
    },
  })
  if (!create.ok) {
    console.error("✗ POST create", create.status, create.json)
    process.exit(1)
  }
  const taId = create.json?.ta?.id
  console.log(`✓ POST create id=${taId}`)

  const getPerm = await req("/api/instructor/ta-permissions", {
    instructorId,
    query: { taId: String(taId), courseId: String(COURSE_ID) },
  })
  if (!getPerm.ok) {
    console.error("✗ GET permissions", getPerm.status, getPerm.json)
  } else {
    const keys = getPerm.json?.keys?.length ?? 0
    console.log(`✓ GET permissions (${keys} keys)`)
  }

  const permKey = getPerm.json?.keys?.[0] ?? "canDraftAnnouncements"
  const wasEnabled = Boolean(getPerm.json?.effective?.[permKey])
  const patchPerm = await req("/api/instructor/ta-permissions", {
    method: "PATCH",
    instructorId,
    body: {
      taId,
      courseId: COURSE_ID,
      permissions: { [permKey]: !wasEnabled },
    },
  })
  if (!patchPerm.ok) {
    console.error("✗ PATCH permission", patchPerm.status, patchPerm.json)
  } else {
    console.log(`✓ PATCH permission ${permKey} → ${!wasEnabled}`)
  }

  // restore permission
  await req("/api/instructor/ta-permissions", {
    method: "PATCH",
    instructorId,
    body: { taId, courseId: COURSE_ID, permissions: { [permKey]: wasEnabled } },
  })

  const update = await req(`/api/instructor/teaching-assistants/${taId}`, {
    method: "PATCH",
    instructorId,
    body: {
      name: `QA TA Updated ${stamp}`,
      course_ids: [COURSE_ID],
    },
  })
  console.log(update.ok ? `✓ PATCH update name` : `✗ PATCH update ${update.status} ${JSON.stringify(update.json)}`)

  const del = await req(`/api/instructor/teaching-assistants/${taId}`, {
    method: "DELETE",
    instructorId,
  })
  console.log(del.ok ? `✓ DELETE deactivate` : `✗ DELETE ${del.status}`)

  const reactivate = await req(`/api/instructor/teaching-assistants/${taId}`, {
    method: "PATCH",
    instructorId,
    body: { is_active: true },
  })
  console.log(reactivate.ok ? `✓ PATCH reactivate` : `✗ PATCH reactivate ${reactivate.status}`)

  const cleanup = await req(`/api/instructor/teaching-assistants/${taId}`, {
    method: "DELETE",
    instructorId,
  })
  console.log(cleanup.ok ? `✓ DELETE final cleanup` : `✗ DELETE cleanup ${cleanup.status}`)

  const listAfter = await req("/api/instructor/teaching-assistants", { instructorId })
  const stillListed = (listAfter.json?.tas ?? []).some((t) => t.id === taId && t.is_active)
  console.log(stillListed ? `⚠ TA still active in list` : `✓ TA deactivated (inactive or absent)`)

  console.log("\nDone.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
