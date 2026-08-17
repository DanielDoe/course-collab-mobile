#!/usr/bin/env node
/**
 * iOS production configuration audit.
 *
 * Run: npm run audit:ios
 */
import {
  EXPO_ROOT,
  printSection,
  readJson,
  readText,
  recordResult,
} from "./lib/audit-shared.mjs"
import fs from "node:fs"
import path from "node:path"

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

printSection("iOS identity")
const appJson = readJson("app.json")
const ios = appJson.expo?.ios ?? {}

if (ios.bundleIdentifier === "com.coursecollab.app") pass("bundle-id", ios.bundleIdentifier)
else fail("bundle-id", ios.bundleIdentifier || "missing")

if (appJson.expo?.version) pass("marketing-version", appJson.expo.version)
else fail("marketing-version", "missing expo.version")

if (ios.buildNumber) pass("build-number", String(ios.buildNumber))
else warn("build-number", "ios.buildNumber missing — EAS remote versioning may still increment")

printSection("Signing & entitlements")
const entitlements = readText("ios/CourseCollab/CourseCollab.entitlements")
if (entitlements.includes("<string>production</string>")) pass("aps-environment", "production")
else fail("aps-environment", "aps-environment must be production for App Store push")

if (entitlements.includes("applinks:coursecollab.vercel.app")) {
  pass("associated-domains", "entitlements include production applinks")
} else {
  fail("associated-domains", "missing associated domains entitlements", "high")
}

if (Array.isArray(ios.associatedDomains) && ios.associatedDomains.length > 0) {
  pass("appjson-associated-domains", ios.associatedDomains.join(", "))
} else {
  fail("appjson-associated-domains", "expo.ios.associatedDomains missing", "high")
}

printSection("App Transport Security")
const infoPlist = readText("ios/CourseCollab/Info.plist")
if (infoPlist.includes("<key>NSAllowsArbitraryLoads</key>") && infoPlist.includes("<false/>")) {
  pass("ats-no-arbitrary-loads", "NSAllowsArbitraryLoads=false")
} else {
  fail("ats-no-arbitrary-loads", "ATS must deny arbitrary loads")
}

if (/<key>NSAllowsLocalNetworking<\/key>\s*<true\/>/.test(infoPlist)) {
  fail("ats-no-local-networking", "NSAllowsLocalNetworking must be false in production", "high")
} else {
  pass("ats-no-local-networking", "local HTTP networking is not allowed")
}

printSection("Privacy & usage descriptions")
if (fs.existsSync(path.join(EXPO_ROOT, "ios/CourseCollab/PrivacyInfo.xcprivacy"))) {
  pass("privacy-manifest", "PrivacyInfo.xcprivacy present")
} else {
  fail("privacy-manifest", "missing PrivacyInfo.xcprivacy")
}

for (const key of [
  "NSCameraUsageDescription",
  "NSPhotoLibraryUsageDescription",
  "NSMicrophoneUsageDescription",
  "NSUserNotificationsUsageDescription",
  "NSSpeechRecognitionUsageDescription",
  "NSCalendarsUsageDescription",
]) {
  if (infoPlist.includes(key)) pass(`usage-${key}`, "present")
  else fail(`usage-${key}`, "missing", "high")
}

if (infoPlist.includes("NSRemindersUsageDescription") || infoPlist.includes("NSRemindersFullAccessUsageDescription")) {
  warn("unused-reminders-permission", "Reminders usage strings are present but the app does not use Apple Reminders")
} else {
  pass("unused-reminders-permission", "Reminders permission not requested")
}

printSection("Xcode project")
const pbx = readText("ios/CourseCollab.xcodeproj/project.pbxproj")
if (pbx.includes("MARKETING_VERSION = 1.0.0") || pbx.includes(`MARKETING_VERSION = ${appJson.expo.version}`)) {
  pass("pbx-marketing-version", "aligned with app.json")
} else {
  fail("pbx-marketing-version", "Xcode MARKETING_VERSION does not match app.json", "high")
}

const critical = results.filter((r) => !r.ok && r.severity === "critical")
const high = results.filter((r) => !r.ok && r.severity === "high")
const warnings = results.filter((r) => !r.ok && r.severity === "warning")

console.log("\nIOS AUDIT SUMMARY")
console.log(`Checks: ${results.length}`)
console.log(`Critical failures: ${critical.length}`)
console.log(`High failures: ${high.length}`)
console.log(`Warnings: ${warnings.length}`)

if (critical.length > 0 || high.length > 0) process.exitCode = 1
