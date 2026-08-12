#!/usr/bin/env python3
"""Generate Capacitor icon + splash from themed CourseCollab mark."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB_SCRIPT = ROOT.parent / "v0-coursecollabv3" / "scripts" / "generate-brand-mark.py"


def main() -> None:
    if WEB_SCRIPT.exists():
        subprocess.run([sys.executable, str(WEB_SCRIPT)], check=True)
    else:
        print(f"Warning: {WEB_SCRIPT} not found; using existing assets/icon.png")

    icon = ROOT / "assets" / "icon.png"
    if not icon.exists():
        raise SystemExit("assets/icon.png missing after brand generation")

    if (ROOT / "node_modules" / "@capacitor" / "assets").exists():
        subprocess.run(
            [
                "npx",
                "capacitor-assets",
                "generate",
                "--iconBackgroundColor",
                "#582c83",
                "--splashBackgroundColor",
                "#582c83",
            ],
            cwd=ROOT,
            check=True,
        )
        print("Capacitor native icons + splash updated")


if __name__ == "__main__":
    main()
