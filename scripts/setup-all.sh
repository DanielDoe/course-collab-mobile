#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/setup-env.sh"

echo "==> CourseCollab mobile toolchain"
echo "Java: $(java -version 2>&1 | head -1)"
echo "Android SDK: $ANDROID_HOME"
echo "Disk free: $(df -h / | tail -1 | awk '{print $4}')"

if ! command -v sdkmanager >/dev/null; then
  echo "Install: brew install --cask android-commandlinetools"
  exit 1
fi

FREE_MB=$(df -m / | tail -1 | awk '{print $4}')
if [ "$FREE_MB" -lt 8192 ]; then
  echo "WARNING: Less than 8GB free disk — Android emulator may fail."
  echo "Free space or use a physical device: adb install android/app/build/outputs/apk/debug/app-debug.apk"
fi

cd "$ROOT"
npm install
npm run cap:sync android 2>&1 | tail -5 || npm run build && npx cap sync android

echo ""
echo "Done. Next:"
echo "  npm run dev:android     # emulator + run (needs 8GB+ free)"
echo "  npm run cap:open:android # open Android Studio"
echo "  npm run cap:open:ios     # requires Xcode from App Store"
