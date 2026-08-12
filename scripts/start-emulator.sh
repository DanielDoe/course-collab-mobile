#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/setup-env.sh"
AVD="${1:-CourseCollab_Pixel}"

if "$ANDROID_HOME/platform-tools/adb" devices | grep -q emulator; then
  echo "Emulator already running"
  exit 0
fi

echo "Starting $AVD..."
nohup "$ANDROID_HOME/emulator/emulator" -avd "$AVD" -no-snapshot-load >/tmp/coursecollab-emulator.log 2>&1 &
"$ANDROID_HOME/platform-tools/adb" wait-for-device
echo "Emulator ready"
