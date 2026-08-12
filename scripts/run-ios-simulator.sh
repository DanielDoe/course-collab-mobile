#!/usr/bin/env bash
# Build and run CourseCollab on the iOS Simulator (uses full Xcode.app).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"

cd "$ROOT/expo"

if ! xcrun simctl list runtimes 2>/dev/null | grep -q "iOS"; then
  echo "No iOS Simulator runtime found. Downloading (one-time, ~8GB)..."
  xcodebuild -downloadPlatform iOS
fi

# First boot after a new iOS runtime: dyld shared cache must finish or apps watchdog-crash.
if pgrep -f "update_dyld_sim_shared_cache" >/dev/null; then
  echo "iOS Simulator runtime is still initializing (one-time after download)..."
  while pgrep -f "update_dyld_sim_shared_cache" >/dev/null; do sleep 5; done
  echo "Runtime ready."
fi

DEVICE="${1:-iPhone 17 Pro}"
echo "Building for simulator: $DEVICE"
npx expo run:ios --device "$DEVICE"
