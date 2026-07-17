#!/usr/bin/env node
import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

execSync("python3 scripts/generate-assets.py", { stdio: "inherit", cwd: root })

if (existsSync(join(root, "node_modules", "@capacitor", "assets"))) {
  execSync(
    "npx capacitor-assets generate --iconBackgroundColor '#582c83' --splashBackgroundColor '#582c83'",
    { cwd: root, stdio: "inherit" },
  )
}
