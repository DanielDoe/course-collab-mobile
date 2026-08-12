#!/usr/bin/env node
import { execSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

execSync("python3 scripts/generate-assets.py", { stdio: "inherit", cwd: root })
