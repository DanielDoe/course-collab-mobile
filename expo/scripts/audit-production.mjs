#!/usr/bin/env node
/**
 * Production configuration guard for the Expo mobile client.
 *
 * Run: npm run audit:production
 */
import {
  collectProductionScanFiles,
  EXPO_ROOT,
  printSection,
  readJson,
  recordResult,
  scanFileForForbiddenPatterns,
} from "./lib/audit-shared.mjs"

const results = []

function pass(id, detail) {
  recordResult(results, { id, ok: true, detail })
}

function fail(id, detail, severity = "critical") {
  recordResult(results, { id, ok: false, detail, severity })
}

printSection("Expo app configuration")
const appJson = readJson("app.json")
const extra = appJson.expo?.extra ?? {}
const appUrl = String(extra.appUrl ?? "")
const environment = String(extra.environment ?? "")

if (environment === "production") pass("env-extra-production", "expo.extra.environment=production")
else fail("env-extra-production", `expected production, got ${environment || "(missing)"}`, "high")

if (appUrl.startsWith("https://") && !appUrl.includes("localhost")) {
  pass("api-url-configured", appUrl)
} else {
  fail("api-url-configured", appUrl || "(missing)")
}

if (appJson.expo?.ios?.bundleIdentifier === "com.coursecollab.app") {
  pass("ios-bundle-id", appJson.expo.ios.bundleIdentifier)
} else {
  fail("ios-bundle-id", appJson.expo?.ios?.bundleIdentifier || "(missing)")
}

printSection("Forbidden endpoint / secret scan")
const findings = []
for (const file of collectProductionScanFiles()) {
  findings.push(...scanFileForForbiddenPatterns(file))
}

if (findings.length === 0) {
  pass("endpoint-scan-clean", "No prohibited patterns in production scan paths")
} else {
  for (const finding of findings) {
    fail(`scan-${finding.id}`, `${finding.file}`, finding.severity)
  }
}

printSection("Required compliance routes (mobile source)")
const requiredRoutes = [
  "app/(app)/settings/privacy-security.tsx",
  "app/(app)/settings/delete-account.tsx",
  "app/(app)/settings/legal/privacy.tsx",
  "app/(app)/settings/legal/terms.tsx",
  "app/(app)/settings/legal/support.tsx",
  "app/(app)/settings/ai-data.tsx",
  "src/lib/legal-content-api.ts",
  "src/hooks/useLegalDocument.ts",
  "src/content/legal/fallback.ts",
  "src/lib/account-deletion-api.ts",
  "src/lib/clear-user-local-state.ts",
  "src/lib/trusted-origins.ts",
  "src/config/legal.ts",
  "src/config/production-guard.ts",
  "ios/CourseCollab/PrivacyInfo.xcprivacy",
]

for (const rel of requiredRoutes) {
  try {
    const fs = await import("node:fs")
    const full = `${EXPO_ROOT}/${rel}`
    if (fs.existsSync(full)) pass(`file-${rel}`, "present")
    else fail(`file-${rel}`, "missing")
  } catch (err) {
    fail(`file-${rel}`, String(err))
  }
}

const critical = results.filter((r) => !r.ok && r.severity === "critical")
const high = results.filter((r) => !r.ok && r.severity === "high")
const warnings = results.filter((r) => !r.ok && r.severity === "warning")

console.log("\nPRODUCTION AUDIT SUMMARY")
console.log(`Checks: ${results.length}`)
console.log(`Critical failures: ${critical.length}`)
console.log(`High failures: ${high.length}`)
console.log(`Warnings: ${warnings.length}`)

if (critical.length > 0 || high.length > 0) {
  process.exitCode = 1
}
