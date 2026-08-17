#!/usr/bin/env node
/**
 * App Store readiness audit for the Expo iOS client.
 *
 * Run: npm run audit:appstore
 */
import fs from "node:fs"
import path from "node:path"
import {
  EXPO_ROOT,
  PRODUCTION_API_BASE,
  fetchStatus,
  printSection,
  readJson,
  readText,
  recordResult,
} from "./lib/audit-shared.mjs"

const results = []

function pass(id, detail) {
  recordResult(results, { id, ok: true, detail })
}

function fail(id, detail, severity = "critical") {
  recordResult(results, { id, ok: false, detail, severity })
}

function warn(id, detail) {
  recordResult(results, { id, ok: false, detail, severity: "warning" })
}

const apiBase = (process.env.AUDIT_API_BASE || PRODUCTION_API_BASE).replace(/\/$/, "")
const LEGAL_URLS = {
  privacyPolicy: `${apiBase}/legal/privacy-policy`,
  termsOfService: `${apiBase}/legal/terms-of-service`,
  support: `${apiBase}/support`,
  aiAndData: `${apiBase}/ai-and-data`,
}

printSection("Release configuration")
const appJson = readJson("app.json")
const ios = appJson.expo?.ios ?? {}

if (appJson.expo?.version) pass("release-version", appJson.expo.version)
else fail("release-version", "missing expo.version")

if (ios.bundleIdentifier === "com.coursecollab.app") pass("bundle-id", ios.bundleIdentifier)
else fail("bundle-id", ios.bundleIdentifier || "missing")

if (String(appJson.expo?.extra?.environment ?? "") === "production") pass("production-environment", "production")
else fail("production-environment", String(appJson.expo?.extra?.environment ?? "missing"))

printSection("Privacy manifest & permissions")
if (fs.existsSync(path.join(EXPO_ROOT, "ios/CourseCollab/PrivacyInfo.xcprivacy"))) {
  pass("privacy-manifest", "PrivacyInfo.xcprivacy present")
} else {
  fail("privacy-manifest", "missing PrivacyInfo.xcprivacy")
}

const infoPlist = readText("ios/CourseCollab/Info.plist")
for (const key of [
  "NSCameraUsageDescription",
  "NSPhotoLibraryUsageDescription",
  "NSMicrophoneUsageDescription",
  "NSUserNotificationsUsageDescription",
  "NSSpeechRecognitionUsageDescription",
]) {
  if (infoPlist.includes(key)) pass(`usage-${key}`, "present")
  else fail(`usage-${key}`, "missing", "high")
}

const entitlements = readText("ios/CourseCollab/CourseCollab.entitlements")
if (entitlements.includes("<string>production</string>")) pass("aps-environment", "production")
else if (entitlements.includes("development")) fail("aps-environment", "development — use production for App Store release")
else fail("aps-environment", "aps-environment not found")

if (entitlements.includes("applinks:")) pass("associated-domains", "present")
else fail("associated-domains", "associated domains missing", "high")

if (/<key>NSAllowsLocalNetworking<\/key>\s*<true\/>/.test(infoPlist)) {
  fail("ats-local-networking", "NSAllowsLocalNetworking is enabled in the production Info.plist", "high")
} else {
  pass("ats-local-networking", "local networking disabled")
}

printSection("Compliance surfaces")
for (const rel of [
  "app/(app)/settings/privacy-security.tsx",
  "app/(app)/settings/delete-account.tsx",
  "src/lib/account-deletion-api.ts",
  "src/lib/compliance/ios-purchase-policy.ts",
  "src/components/support/IosExternalPurchaseScreen.tsx",
  "docs/APP_STORE_REVIEW_CREDENTIALS.md",
]) {
  if (fs.existsSync(path.join(EXPO_ROOT, rel))) pass(`compliance-${rel}`, "present")
  else fail(`compliance-${rel}`, "missing")
}

printSection("Legal URL availability")
for (const [id, url] of Object.entries(LEGAL_URLS)) {
  const status = await fetchStatus(url)
  if (status >= 200 && status < 400) pass(`legal-${id}`, `${url} (${status})`)
  else fail(`legal-${id}`, `${url} returned ${status || "network error"}`, "critical")
}

printSection("Account deletion API contract")
for (const route of [
  "/api/account/delete",
  "/api/student/account/delete",
  "/api/guest/account/delete",
  "/api/instructor/account/delete",
]) {
  const status = await fetchStatus(`${apiBase}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
  if (status === 404) fail(`api-${route}`, "endpoint missing", "critical")
  else if ([400, 401, 403, 405, 429].includes(status)) pass(`api-${route}`, `protected (${status})`)
  else warn(`api-${route}`, `unexpected status ${status}`)
}

printSection("Payments compliance")
const paymentsConfig = readText("src/config/payments.ts")
if (paymentsConfig.includes("iosNativeDigitalCheckout: false")) {
  pass("ios-native-checkout-disabled", "iOS native digital checkout disabled in config")
} else {
  fail("ios-native-checkout-disabled", "expected iosNativeDigitalCheckout: false")
}

const checkoutRoute = readText("app/(app)/membership/checkout.tsx")
if (checkoutRoute.includes("IosExternalPurchaseScreen") && checkoutRoute.includes('Platform.OS === "ios"')) {
  pass("ios-membership-external-checkout", "iOS membership uses external web checkout")
} else {
  fail("ios-membership-external-checkout", "iOS membership checkout guard missing")
}

const iosPolicyStatus = await fetchStatus(`${apiBase}/api/compliance/ios-purchase-policy`)
if (iosPolicyStatus >= 200 && iosPolicyStatus < 400) pass("ios-purchase-policy-api", `(${iosPolicyStatus})`)
else warn("ios-purchase-policy-api", `returned ${iosPolicyStatus || "network error"} until backend deploy`)

const critical = results.filter((r) => !r.ok && r.severity === "critical")
const high = results.filter((r) => !r.ok && r.severity === "high")
const warnings = results.filter((r) => !r.ok && r.severity === "warning")

console.log("\nAPP STORE AUDIT SUMMARY")
console.log(`Checks: ${results.length}`)
console.log(`Critical failures: ${critical.length}`)
console.log(`High failures: ${high.length}`)
console.log(`Warnings: ${warnings.length}`)

if (critical.length > 0 || high.length > 0) process.exitCode = 1
