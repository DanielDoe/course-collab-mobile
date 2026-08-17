import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const EXPO_ROOT = path.resolve(__dirname, "../..")
export const REPO_ROOT = path.resolve(EXPO_ROOT, "..")

export const PRODUCTION_API_BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")

export const PRODUCTION_SCAN_GLOBS = ["src", "app", "app.json", "package.json"]

export const PRODUCTION_SCAN_FILES = [
  "ios/CourseCollab/Info.plist",
  "ios/CourseCollab/PrivacyInfo.xcprivacy",
  "ios/CourseCollab/CourseCollab.entitlements",
]

export const PRODUCTION_ALLOWLIST_PATH_FRAGMENTS = [
  "/scripts/",
  "/docs/",
  "/maestro/",
  "/sim-audit/",
  ".test.",
  ".md",
  "audit-production.mjs",
  "audit-appstore.mjs",
  "audit-ios.mjs",
  "release-audit.mjs",
  "audit-shared.mjs",
  "config/environment.ts",
  "config/api.ts",
]

export const PRODUCTION_FORBIDDEN_PATTERNS = [
  { id: "localhost", regex: /\blocalhost\b/i, severity: "critical" },
  { id: "127.0.0.1", regex: /\b127\.0\.0\.1\b/, severity: "critical" },
  { id: "0.0.0.0", regex: /\b0\.0\.0\.0\b/, severity: "critical" },
  { id: "ngrok", regex: /\.ngrok/i, severity: "critical" },
  { id: "staging-domain", regex: /\bstaging\.[a-z0-9.-]+\b/i, severity: "high" },
  { id: "preview-domain", regex: /\.preview\.vercel\.app\b/i, severity: "high" },
  { id: "sk-live", regex: /\bsk_live_[A-Za-z0-9]+\b/, severity: "critical" },
  { id: "sk-test", regex: /\bsk_test_[A-Za-z0-9]+\b/, severity: "high" },
  { id: "openai-key", regex: /\bsk-[A-Za-z0-9]{10,}\b/, severity: "critical" },
  { id: "anthropic-key", regex: /\bsk-ant-[A-Za-z0-9_-]+\b/, severity: "critical" },
  { id: "stripe-webhook", regex: /\bwhsec_[A-Za-z0-9]+\b/, severity: "critical" },
  { id: "postgres-url", regex: /\bpostgres(?:ql)?:\/\//i, severity: "critical" },
]

export function isAllowlistedScanPath(relativePath) {
  return PRODUCTION_ALLOWLIST_PATH_FRAGMENTS.some((fragment) => relativePath.includes(fragment))
}

export function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "Pods") continue
      walkFiles(full, files)
    } else if (entry.isFile()) {
      files.push(full)
    }
  }
  return files
}

export function collectProductionScanFiles(root = EXPO_ROOT) {
  const files = []
  for (const rel of PRODUCTION_SCAN_GLOBS) {
    const target = path.join(root, rel)
    if (!fs.existsSync(target)) continue
    const stat = fs.statSync(target)
    if (stat.isDirectory()) {
      walkFiles(target, files)
    } else {
      files.push(target)
    }
  }
  for (const rel of PRODUCTION_SCAN_FILES) {
    const target = path.join(root, rel)
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      files.push(target)
    }
  }
  return files
}

export function scanFileForForbiddenPatterns(filePath, root = EXPO_ROOT) {
  const relative = path.relative(root, filePath).replaceAll("\\", "/")
  if (isAllowlistedScanPath(relative)) return []

  const text = fs.readFileSync(filePath, "utf8")
  const findings = []
  for (const pattern of PRODUCTION_FORBIDDEN_PATTERNS) {
    if (pattern.regex.test(text)) {
      findings.push({ ...pattern, file: relative })
    }
  }
  return findings
}

export async function fetchStatus(url, init = {}) {
  try {
    const res = await fetch(url, { ...init, redirect: "follow" })
    return res.status
  } catch {
    return 0
  }
}

export function readJson(relativeFromExpo) {
  const full = path.join(EXPO_ROOT, relativeFromExpo)
  return JSON.parse(fs.readFileSync(full, "utf8"))
}

export function readText(relativeFromExpo) {
  const full = path.join(EXPO_ROOT, relativeFromExpo)
  return fs.readFileSync(full, "utf8")
}

export function printSection(title) {
  console.log(`\n=== ${title} ===\n`)
}

export function recordResult(results, { id, ok, severity = "critical", detail }) {
  results.push({ id, ok, severity, detail })
  const prefix = ok ? "✓" : severity === "warning" ? "!" : "✗"
  const stream = ok ? console.log : severity === "warning" ? console.warn : console.error
  stream(`  ${prefix} ${id}${detail ? ` — ${detail}` : ""}`)
}
