/**
 * Run: npm run test -- scripts/audit-production.test.mjs
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  EXPO_ROOT,
  isAllowlistedScanPath,
  scanFileForForbiddenPatterns,
} from "./lib/audit-shared.mjs"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

describe("audit production allowlist", () => {
  it("allows docs and scripts", () => {
    assert.equal(isAllowlistedScanPath("docs/audits/foo.md"), true)
    assert.equal(isAllowlistedScanPath("scripts/audit-production.mjs"), true)
    assert.equal(isAllowlistedScanPath("src/constants.ts"), false)
  })

  it("detects localhost in production scan targets", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-audit-"))
    const file = path.join(dir, "sample.ts")
    fs.writeFileSync(file, 'const url = "http://localhost:3000"\n')
    const findings = scanFileForForbiddenPatterns(file, dir)
    assert.ok(findings.some((f) => f.id === "localhost"))
  })
})

describe("legal config files", () => {
  it("declares centralized legal and deletion constants", () => {
    const legal = fs.readFileSync(path.join(EXPO_ROOT, "src/config/legal.ts"), "utf8")
    assert.match(legal, /getLegalUrls/)
    assert.match(legal, /ACCOUNT_DELETION_API_PATH/)
    assert.match(legal, /accountDeletionKindForPortal/)
  })
})
