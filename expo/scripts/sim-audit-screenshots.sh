#!/usr/bin/env bash
# Navigate key student routes via deep link and capture screenshots for UI audit.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="sim-audit"
mkdir -p "$OUT"

reload() { curl -s -X POST http://localhost:8081/reload >/dev/null || true; sleep 2; }

routes=(
  "dashboard"
  "module/practice"
  "module/grades"
  "announcements"
  "announcements/46"
  "module/calendar"
  "module/syllabus"
  "module/course-policies"
  "module/office-hours"
  "module/recommendations"
  "module/classroom-points"
  "module/attendance"
  "module/trade-center"
  "collaboration/playground"
  "module/help-center"
  "module/submit-ticket"
  "module/report-bug"
  "module/feature-requests"
  "membership"
  "settings/appearance"
)

reload

for route in "${routes[@]}"; do
  slug="${route//\//-}"
  slug="${slug//\?/-}"
  echo "→ $route"
  xcrun simctl openurl booted "coursecollab:///${route}" 2>/dev/null || true
  sleep 2.5
  xcrun simctl io booted screenshot "$OUT/${slug}.png" 2>/dev/null || true
done

echo "Screenshots saved to expo/$OUT/"
