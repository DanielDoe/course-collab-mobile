#!/usr/bin/env node
/**
 * Orchestrates release readiness checks for CourseCollab mobile.
 *
 * Run: npm run release:audit
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXPO_ROOT = path.resolve(__dirname, "..")

const sections = [
  { name: "Type Check", command: "npm", args: ["run", "typecheck"] },
  { name: "Unit Tests", command: "npm", args: ["run", "test"] },
  { name: "Production Audit", command: "npm", args: ["run", "audit:production"] },
  { name: "iOS Audit", command: "npm", args: ["run", "audit:ios"] },
  { name: "App Store Audit", command: "npm", args: ["run", "audit:appstore"] },
]

const outcomes = []

function runStep(section) {
  const result = spawnSync(section.command, section.args, {
    cwd: EXPO_ROOT,
    encoding: "utf8",
    stdio: "pipe",
  })
  const ok = result.status === 0
  outcomes.push({ ...section, ok, stdout: result.stdout, stderr: result.stderr })
  if (!ok && result.stdout) process.stdout.write(result.stdout)
  if (!ok && result.stderr) process.stderr.write(result.stderr)
  return ok
}

for (const section of sections) {
  runStep(section)
}

const labels = {
  "Type Check": "Type checking",
  "Unit Tests": "Tests",
  "Production Audit": "Production configuration / secret scan",
  "iOS Audit": "iOS configuration",
  "App Store Audit": "Privacy / App Store configuration",
}

console.log("\nCOURSECOLLAB RELEASE AUDIT\n")
for (const outcome of outcomes) {
  const label = labels[outcome.name] ?? outcome.name
  console.log(`${label.padEnd(42)} ${outcome.ok ? "PASS" : "FAIL"}`)
}

const failed = outcomes.filter((o) => !o.ok)
console.log(`\nFailed checks: ${failed.length}`)
console.log(`Passed checks: ${outcomes.length - failed.length}`)

if (failed.length === 0) {
  console.log("\nRESULT: Internal TestFlight gates passed (live legal/API probes included)")
} else {
  console.log("\nRESULT: Release gates failed — not ready for TestFlight until failures are resolved")
  process.exitCode = 1
}
