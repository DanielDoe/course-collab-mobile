#!/usr/bin/env node
/**
 * Cross-repo CourseCollab production audit orchestrator.
 *
 * Runs mobile client checks (this repo) then shared backend checks (v0-coursecollabv3).
 *
 * Usage: npm run audit:coursecollab
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MOBILE_ROOT = path.resolve(__dirname, "..")
const EXPO_ROOT = path.join(MOBILE_ROOT, "expo")
const WEB_ROOT = path.resolve(MOBILE_ROOT, "..", "v0-coursecollabv3")

function run(cwd, label, command, args) {
  console.log(`\n=== ${label} ===\n`)
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" })
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
  if (output) console.log(output)
  return { label, ok: result.status === 0 }
}

const steps = [
  run(EXPO_ROOT, "Mobile unit tests", "npm", ["run", "test"]),
  run(EXPO_ROOT, "Mobile production audit", "npm", ["run", "audit:mobile-production"]),
  run(EXPO_ROOT, "App Store audit", "npm", ["run", "audit:appstore"]),
]

try {
  const fs = await import("node:fs")
  if (fs.existsSync(path.join(WEB_ROOT, "package.json"))) {
    steps.push(run(WEB_ROOT, "Backend audit:coursecollab", "npm", ["run", "audit:coursecollab"]))
  } else {
    console.log("\nWARN  Backend repo not found at ../v0-coursecollabv3 — skipping shared API audit\n")
  }
} catch {
  console.log("\nWARN  Could not locate backend repo — skipping shared API audit\n")
}

const failed = steps.filter((step) => !step.ok)

console.log("\nCOURSECOLLAB CROSS-REPO AUDIT\n")
for (const step of steps) {
  console.log(`${step.label.padEnd(32)} ${step.ok ? "PASS" : "FAIL"}`)
}

console.log(`\nFailed steps: ${failed.length}`)
process.exit(failed.length ? 1 : 0)
