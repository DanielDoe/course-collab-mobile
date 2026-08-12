#!/usr/bin/env bash
set -euo pipefail

XCODE="/Applications/Xcode.app/Contents/Developer"

if [[ ! -d "$XCODE" ]]; then
  echo "Xcode is not installed. Install it from the Mac App Store first:"
  echo "  open macappstore://apps.apple.com/app/id497799835"
  exit 1
fi

echo "→ Switching active developer directory to Xcode…"
sudo xcode-select -s "$XCODE"

echo "→ Running Xcode first-launch setup (components, simulators)…"
sudo xcodebuild -runFirstLaunch

echo "→ Accepting Xcode license…"
sudo xcodebuild -license accept 2>/dev/null || true

echo "→ Installing iOS platform support (if needed)…"
sudo xcodebuild -downloadPlatform iOS 2>/dev/null || true

echo ""
echo "✓ Xcode is configured:"
xcode-select -p
xcodebuild -version | head -1
xcrun simctl list runtimes 2>/dev/null | grep -i ios | head -3 || true

echo ""
echo "Next (Expo project):"
echo "  cd expo/ios && pod install"
echo "  cd .. && npx expo run:ios --device   # physical iPhone"
echo "  npx expo run:ios --device \"iPhone 17 Pro\"   # simulator"
