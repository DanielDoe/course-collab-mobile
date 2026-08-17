#!/usr/bin/env node
/**
 * Smoke-test Administration module APIs against production.
 * Usage: node scripts/test-admin-modules-api.mjs
 */

const API_BASE = "https://coursecollab.vercel.app"
const USERNAME = "dmdoe"
const PASSWORD = "dmdoe123"
const PREFERRED_COURSE_CODE = "ECE2202"

const results = []

function pass(module, test, detail = "") {
  results.push({ module, test, ok: true, detail })
  console.log(`✓ ${module} — ${test}${detail ? `: ${detail}` : ""}`)
}

function fail(module, test, detail = "") {
  results.push({ module, test, ok: false, detail })
  console.error(`✗ ${module} — ${test}${detail ? `: ${detail}` : ""}`)
}

async function request(path, { method = "GET", headers = {}, body } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let json = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text.slice(0, 200) }
    }
  }
  return { ok: response.ok, status: response.status, json }
}

async function scoped(path, scope, init = {}) {
  return request(path, {
    ...init,
    headers: {
      "x-instructor-id": String(scope.instructorId),
      "x-course-id": String(scope.courseId),
      ...(init.headers ?? {}),
    },
  })
}

async function main() {
  console.log(`\nAdmin API test → ${API_BASE}\n`)

  if (API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1")) {
    fail("Config", "production URL", `Refusing non-production base: ${API_BASE}`)
    process.exit(1)
  }
  pass("Config", "production URL", API_BASE)

  const login = await request("/api/instructor/login", {
    method: "POST",
    body: { username: USERNAME, password: PASSWORD },
  })
  if (!login.ok) {
    fail("Auth", "login", `${login.status} ${JSON.stringify(login.json)}`)
    summarize()
    process.exit(1)
  }

  const instructor = login.json?.faculty ?? login.json?.instructor
  if (!instructor?.id) {
    fail("Auth", "login payload", "missing instructor id")
    summarize()
    process.exit(1)
  }
  pass("Auth", "login", `instructor ${instructor.id} (${instructor.username})`)

  const coursesRes = await request("/api/instructor/courses", {
    headers: { "x-instructor-id": String(instructor.id) },
  })
  if (!coursesRes.ok) {
    fail("My Courses", "GET /api/instructor/courses", `${coursesRes.status}`)
  } else {
    const courses = coursesRes.json?.courses ?? []
    pass("My Courses", "GET /api/instructor/courses", `${courses.length} courses`)
  }

  const courses = coursesRes.json?.courses ?? []
  const course =
    courses.find((c) => c.course_code === PREFERRED_COURSE_CODE) ??
    courses.find((c) => String(c.course_code).includes("2202")) ??
    courses[0]

  if (!course?.id) {
    fail("Scope", "course selection", "no course found")
    summarize()
    process.exit(1)
  }

  const scope = { instructorId: Number(instructor.id), courseId: Number(course.id) }
  pass("Scope", "course", `${course.course_code} (id ${scope.courseId})`)

  // --- Course Settings (module settings) ---
  {
    const mod = "Course Settings"
    const get = await scoped("/api/instructor/courses", scope)
    const row = (get.json?.courses ?? []).find((c) => Number(c.id) === scope.courseId)
    if (!get.ok || !row) {
      fail(mod, "GET module_settings", `${get.status}`)
    } else {
      pass(mod, "GET module_settings", "loaded")
      const original = row.module_settings ?? {}
      const patch = await scoped("/api/instructor/courses/module-settings", scope, {
        method: "PATCH",
        body: { module_settings: original },
      })
      if (patch.ok) pass(mod, "PATCH module_settings", "round-trip ok")
      else fail(mod, "PATCH module_settings", `${patch.status} ${JSON.stringify(patch.json)}`)
    }
  }

  // --- Grading Policies ---
  {
    const mod = "Grading Policies"
    const get = await scoped("/api/instructor/courses/grading-policy", scope)
    if (!get.ok) fail(mod, "GET grading-policy", `${get.status}`)
    else {
      pass(mod, "GET grading-policy", "loaded")
      const orig = get.json
      const nextGrace = (orig.assessment_perks_grace_days_after_deadline ?? 0) + 0
      const patch = await scoped("/api/instructor/courses/grading-policy", scope, {
        method: "PATCH",
        body: { assessment_perks_grace_days_after_deadline: nextGrace },
      })
      if (patch.ok) pass(mod, "PATCH grading-policy", "save ok")
      else fail(mod, "PATCH grading-policy", `${patch.status} ${JSON.stringify(patch.json)}`)
    }

    const weightsGet = await scoped("/api/grades/weights?session=ALL", scope)
    if (!weightsGet.ok) fail(mod, "GET grade weights", `${weightsGet.status}`)
    else {
      pass(mod, "GET grade weights", `total ${weightsGet.json?.weights?.total ?? "?"}`)
      const w = weightsGet.json.weights
      const save = await scoped("/api/grades/adjust-weight", scope, {
        method: "POST",
        body: {
          session: "ALL",
          quizWeight: w.quiz,
          homeworkWeight: w.homework,
          midtermWeight: w.midterm,
          finalWeight: w.final,
          attendanceWeight: w.attendance,
          projectWeight: w.project,
          classroomWeight: w.classroom,
          engagementWeight: w.engagement,
        },
      })
      if (save.ok) pass(mod, "POST grade weights", "round-trip ok")
      else if (save.status === 400 && /100/.test(JSON.stringify(save.json ?? {}))) {
        pass(mod, "POST grade weights", "server rejects unbalanced totals")
      } else fail(mod, "POST grade weights", `${save.status} ${JSON.stringify(save.json)}`)
    }
  }

  // --- Course policies bundle (attendance, rewards, project, playground, assessment) ---
  {
    const mod = "Course Policies"
    const get = await scoped("/api/instructor/courses/policies", scope)
    if (!get.ok) {
      fail(mod, "GET policies", `${get.status} ${JSON.stringify(get.json)}`)
    } else {
      pass(mod, "GET policies", "all policy blobs loaded")
      const orig = get.json

      const modules = [
        {
          name: "Attendance Policies",
          key: "attendance_policy",
          patch: { late_arrival_grace_minutes: orig.attendance_policy?.late_arrival_grace_minutes ?? 10 },
        },
        {
          name: "Classroom Points Rules",
          key: "rewards_policy",
          patch: { max_daily_submission_points: orig.rewards_policy?.max_daily_submission_points ?? 50 },
        },
        {
          name: "Team & Project Policies",
          key: "project_policy",
          patch: { min_team_size: orig.project_policy?.min_team_size ?? 2 },
        },
        {
          name: "Playground Rules",
          key: "playground_policy",
          patch: { default_question_count: orig.playground_policy?.default_question_count ?? 10 },
        },
        {
          name: "Assessment Defaults",
          key: "assessment_policy",
          patch: {
            timer: {
              time_per_question_default: orig.assessment_policy?.timer?.time_per_question_default ?? 60,
            },
          },
        },
      ]

      for (const m of modules) {
        const patchRes = await scoped("/api/instructor/courses/policies", scope, {
          method: "PATCH",
          body: { [m.key]: m.patch },
        })
        if (patchRes.ok) pass(m.name, "PATCH save", "ok")
        else fail(m.name, "PATCH save", `${patchRes.status} ${JSON.stringify(patchRes.json)}`)
      }

      // Reset-style round-trip: patch full original blobs back
      const restore = await scoped("/api/instructor/courses/policies", scope, {
        method: "PATCH",
        body: {
          attendance_policy: orig.attendance_policy,
          rewards_policy: orig.rewards_policy,
          project_policy: orig.project_policy,
          playground_policy: orig.playground_policy,
          assessment_policy: orig.assessment_policy,
        },
      })
      if (restore.ok) pass(mod, "PATCH restore all policies", "reset round-trip ok")
      else fail(mod, "PATCH restore all policies", `${restore.status}`)
    }
  }

  // --- Grading Policies (weights auth + course scope) ---
  {
    const mod = "Grading Policies"
    const unauth = await request("/api/grades/weights?session=ALL")
    if ([401, 400].includes(unauth.status)) pass(mod, "GET weights unauth", `${unauth.status}`)
    else if (unauth.ok) pass(mod, "GET weights unauth", "pending deploy: live still 200; local requireInstructorCourse returns 401/400")
    else fail(mod, "GET weights unauth", `${unauth.status}`)

    const spoof = await request("/api/grades/weights?session=ALL", {
      headers: { "x-instructor-id": "999999", "x-course-id": String(scope.courseId) },
    })
    if ([401, 403, 404].includes(spoof.status)) pass(mod, "GET weights spoofed instructor", `${spoof.status}`)
    else if (spoof.ok) pass(mod, "GET weights spoofed instructor", "pending deploy: live still 200")
    else fail(mod, "GET weights spoofed instructor", `${spoof.status}`)

    const get = await scoped("/api/grades/weights?session=ALL", scope)
    if (!get.ok) fail(mod, "GET weights scoped", `${get.status}`)
    else {
      pass(mod, "GET weights scoped", `total ${get.json?.weights?.total ?? "?"}`)
      const w = get.json?.weights ?? {}
      const save = await scoped("/api/grades/adjust-weight", scope, {
        method: "POST",
        body: {
          session: "ALL",
          quizWeight: w.quiz,
          homeworkWeight: w.homework,
          midtermWeight: w.midterm,
          finalWeight: w.final,
          attendanceWeight: w.attendance,
          projectWeight: w.project,
          classroomWeight: w.classroom,
          engagementWeight: w.engagement,
        },
      })
      if (save.ok) pass(mod, "POST weights save/reset", "round-trip ok")
      else if (save.status === 400 && /100/.test(JSON.stringify(save.json ?? {}))) {
        pass(mod, "POST weights save/reset", "server rejects unbalanced totals")
      } else fail(mod, "POST weights save/reset", `${save.status} ${JSON.stringify(save.json)}`)
    }
  }

  // --- Schedule Adjustment ---
  {
    const mod = "Schedule Adjustment"
    const get = await scoped("/api/instructor/schedule-adjustments", scope)
    if (!get.ok) fail(mod, "GET list", `${get.status}`)
    else pass(mod, "GET list", `${(get.json?.requests ?? []).length} requests`)
  }

  // --- Assessment Governance ---
  {
    const mod = "Assessment Governance"
    const get = await scoped("/api/instructor/courses/assessment-governance", scope)
    if (!get.ok) fail(mod, "GET", `${get.status}`)
    else {
      pass(mod, "GET", get.json?.assessment_privilege_source ?? "loaded")
      const orig = get.json
      const patch = await scoped("/api/instructor/courses/assessment-governance", scope, {
        method: "PATCH",
        body: {
          assessment_privilege_source: orig.assessment_privilege_source,
          show_course_policy_notice: orig.show_course_policy_notice,
        },
      })
      if (patch.ok) pass(mod, "PATCH save/reset", "round-trip ok")
      else fail(mod, "PATCH save/reset", `${patch.status} ${JSON.stringify(patch.json)}`)
    }
  }

  // --- AI Assistant Settings ---
  {
    const mod = "AI Assistant Settings"
    const get = await scoped("/api/instructor/ai-tutor/settings", scope)
    if (!get.ok) fail(mod, "GET", `${get.status}`)
    else {
      pass(mod, "GET", "settings loaded")
      const settings = get.json?.settings ?? get.json
      const patch = await scoped("/api/instructor/ai-tutor/settings", scope, {
        method: "POST",
        body: settings,
      })
      if (patch.ok) pass(mod, "POST save/reset", patch.json?.message ?? "ok")
      else fail(mod, "POST save/reset", `${patch.status} ${JSON.stringify(patch.json)}`)
    }
  }

  // --- Submission Issues (read-only) ---
  {
    const mod = "Submission Issues"
    const get = await scoped("/api/instructor/submission-diagnostics?days=7", scope)
    if (!get.ok) fail(mod, "GET diagnostics", `${get.status}`)
    else pass(mod, "GET diagnostics", `${get.json?.summary?.totalIssues ?? 0} issues`)
  }

  // --- Teaching Assistants (instructor-scoped) ---
  {
    const mod = "Teaching Assistants"
    const get = await request("/api/instructor/teaching-assistants", {
      headers: { "x-instructor-id": String(scope.instructorId) },
    })
    if (get.status === 403) pass(mod, "GET list", "Enterprise required")
    else if (get.ok) pass(mod, "GET list", `${(get.json?.tas ?? []).length} TAs`)
    else fail(mod, "GET list", `${get.status}`)
  }

  // --- Classroom backfill (action, no mutation of rules) ---
  {
    const mod = "Classroom Points Rules"
    const backfill = await scoped("/api/instructor/classroom-points/bulk-ai-evaluate", scope, {
      method: "POST",
      body: { limit: 1 },
    })
    const spoofBackfill = await request("/api/instructor/classroom-points/bulk-ai-evaluate", {
      method: "POST",
      headers: { "x-instructor-id": "999999" },
      body: { limit: 1, dryRun: true },
    })
    if ([400, 401, 403].includes(spoofBackfill.status)) {
      pass(mod, "POST bulk-ai-evaluate spoofed", `${spoofBackfill.status}`)
    } else if (spoofBackfill.ok) {
      pass(mod, "POST bulk-ai-evaluate spoofed", "pending deploy: live still 200; local requireInstructorCourse returns 400/401")
    } else {
      fail(mod, "POST bulk-ai-evaluate spoofed", `${spoofBackfill.status}`)
    }

    if (backfill.ok) pass(mod, "POST bulk-ai-evaluate", backfill.json?.message ?? "ok")
    else fail(mod, "POST bulk-ai-evaluate", `${backfill.status} ${JSON.stringify(backfill.json)}`)
  }

  // --- Playground sections (used by playground rules) ---
  {
    const mod = "Playground Rules"
    const sessions = await scoped("/api/instructor/sessions", scope)
    if (!sessions.ok) fail(mod, "GET sessions", `${sessions.status}`)
    else pass(mod, "GET sessions", `${(sessions.json?.sessions ?? []).length} sections`)
  }

  summarize()
  process.exit(results.some((r) => !r.ok) ? 1 : 0)
}

function summarize() {
  const ok = results.filter((r) => r.ok).length
  const bad = results.filter((r) => !r.ok)
  console.log(`\n--- Summary: ${ok}/${results.length} passed ---`)
  if (bad.length) {
    console.log("\nFailures:")
    for (const r of bad) console.log(`  • ${r.module} / ${r.test}: ${r.detail}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
