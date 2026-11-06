#!/usr/bin/env node
/**
 * Pre-flight for App Store / TestFlight submission.
 *
 * Run: npm run prepare:appstore
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXPO_ROOT = path.resolve(__dirname, "..")

function run(label, command, args) {
  const result = spawnSync(command, args, { cwd: EXPO_ROOT, encoding: "utf8", stdio: "pipe" })
  const ok = result.status === 0
  console.log(`${ok ? "✓" : "✗"} ${label}`)
  if (!ok && result.stdout) process.stdout.write(result.stdout)
  if (!ok && result.stderr) process.stderr.write(result.stderr)
  return ok
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(EXPO_ROOT, rel), "utf8"))
}

console.log("\n=== CourseCollab App Store pre-flight ===\n")

const audits = [
  ["Production audit", "npm", ["run", "audit:production"]],
  ["iOS audit", "npm", ["run", "audit:ios"]],
  ["App Store audit", "npm", ["run", "audit:appstore"]],
]

let auditsOk = true
for (const [label, cmd, args] of audits) {
  if (!run(label, cmd, args)) auditsOk = false
}

console.log("\n=== Configuration checks ===\n")

const appJson = readJson("app.json")
const easJson = readJson("eas.json")
const projectId = appJson.expo?.extra?.eas?.projectId

if (projectId) {
  console.log(`✓ EAS project ID — ${projectId}`)
} else {
  console.log("✗ EAS project ID — missing (run: npx eas init)")
}

const submit = easJson.submit?.production?.ios ?? {}
const placeholders = []
if (!submit.appleId || submit.appleId.includes("REPLACE")) placeholders.push("appleId")
if (!submit.ascAppId || String(submit.ascAppId).includes("REPLACE")) placeholders.push("ascAppId")
if (!submit.appleTeamId || submit.appleTeamId.includes("REPLACE")) placeholders.push("appleTeamId")

if (placeholders.length === 0) {
  console.log("✓ EAS submit credentials — configured")
} else {
  console.log(`✗ EAS submit credentials — set in eas.json: ${placeholders.join(", ")}`)
}

const easWhoami = spawnSync("npx", ["eas-cli", "whoami"], { cwd: EXPO_ROOT, encoding: "utf8", stdio: "pipe" })
if (easWhoami.status === 0) {
  console.log(`✓ Expo account — ${easWhoami.stdout.trim()}`)
} else {
  console.log("✗ Expo account — run: npx eas-cli login")
}

console.log("\n=== Manual steps (Apple + App Store Connect) ===\n")
console.log("1. Apple Developer membership active")
console.log("2. App Store Connect app for bundle ID com.coursecollab.app")
console.log("3. Push notification key uploaded to Expo (eas credentials)")
console.log("4. App Privacy questionnaire (see docs/privacy-data-inventory.md)")
console.log("5. Age rating + export compliance questionnaires")
console.log("6. Screenshots (iPhone required; iPad if supporting tablet)")
console.log("7. Review notes + demo account (expo/docs/APP_STORE_REVIEW_CREDENTIALS.md)")
console.log("8. Deploy AASA for Universal Links:")
console.log("   https://course-collab.com/.well-known/apple-app-site-association (currently 404)")

console.log("\n=== Build & submit commands ===\n")
console.log("cd expo")
console.log("npx eas-cli init                    # link Expo project (once)")
console.log("npm run build:ios                   # production IPA via EAS")
console.log("npm run submit:ios                  # upload latest build to App Store Connect")

if (!auditsOk || !projectId || placeholders.length > 0 || easWhoami.status !== 0) {
  console.log("\nRESULT: Pre-flight incomplete — resolve items above before submitting.")
  process.exitCode = 1
} else {
  console.log("\nRESULT: Automated pre-flight passed. Run build:ios when ready.")
}
