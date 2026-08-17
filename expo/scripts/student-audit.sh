#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CourseCollab — student portal audit pass.
#
# Boots the app in the booted simulator, signs in as the student review
# account, walks every student module via deep link, and screenshots each one
# in light and dark appearance. Also runs a typecheck so code + pixels are
# captured in the same run.
#
#   ./scripts/student-audit.sh                 # full pass, light + dark
#   ./scripts/student-audit.sh --mode light    # one appearance only
#   ./scripts/student-audit.sh --only dashboard,grades,calendar
#   ./scripts/student-audit.sh --skip-typecheck
#
# Output: expo/sim-audit/<mode>/<module>.png  +  expo/sim-audit/typecheck.txt
# ---------------------------------------------------------------------------
set -uo pipefail
cd "$(dirname "$0")/.."

APP_ID="com.coursecollab.app"
SCHEME="coursecollab"
OUT="sim-audit"
MODES="light dark"
ONLY=""
RUN_TYPECHECK=1
SETTLE="${SETTLE:-2.6}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODES="$2"; shift 2 ;;
    --only) ONLY="$2"; shift 2 ;;
    --skip-typecheck) RUN_TYPECHECK=0; shift ;;
    --settle) SETTLE="$2"; shift 2 ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

# --- every student module in drawer order -----------------------------------
# label|route
ROUTES=(
  "dashboard|/dashboard"
  "lectures|/module/lectures"
  "notes|/module/notes"
  "flashcards|/module/flashcards"
  "ai-notetaker|/module/ai-notetaker"
  "practice|/module/practice"
  "cora-assistant|/module/ai-tutor"
  "codebench|/module/codebench"
  "codebench-more|/module/codebench-more"
  "quizzes|/module/quizzes"
  "quiz-history|/module/quiz-history"
  "homework|/module/homework"
  "mid-semester|/module/mid-semester-exams"
  "finals|/module/final-exams"
  "grades|/module/grades"
  "forum|/module/forum"
  "messages|/module/messages"
  "groups|/module/groups"
  "projects|/module/projects"
  "playground|/module/playground"
  "classroom-points|/module/classroom-points"
  "attendance|/module/attendance"
  "trade-center|/module/trade-center"
  "announcements|/announcements"
  "progress-review|/module/progress-review"
  "syllabus|/module/syllabus"
  "calendar|/module/calendar"
  "office-hours|/module/office-hours"
  "policies|/module/course-policies"
  "course-evaluation|/module/course-evaluation"
  "recommendations|/module/recommendations"
  "settings|/settings"
  "settings-appearance|/settings/appearance"
  "view-plans|/membership"
  "help-center|/module/help-center"
  "submit-ticket|/module/submit-ticket"
  "report-bug|/module/report-bug"
  "feature-requests|/module/feature-requests"
)

# --- preflight --------------------------------------------------------------
command -v xcrun >/dev/null || { echo "xcrun not found — install Xcode."; exit 1; }

BOOTED="$(xcrun simctl list devices booted | grep -c Booted || true)"
if [[ "$BOOTED" -eq 0 ]]; then
  echo "No booted simulator. Boot one first:  open -a Simulator"
  exit 1
fi

echo "▸ booted simulator:"
xcrun simctl list devices booted | grep Booted | sed 's/^/    /'

if ! xcrun simctl get_app_container booted "$APP_ID" >/dev/null 2>&1; then
  echo "✗ $APP_ID is not installed on the booted simulator."
  echo "  Run:  npx expo run:ios --device \"iPhone 17 Pro\""
  exit 1
fi

mkdir -p "$OUT"

# --- typecheck (runs while the simulator warms up) --------------------------
if [[ "$RUN_TYPECHECK" -eq 1 ]]; then
  echo "▸ typecheck (npx tsc --noEmit) …"
  npx tsc --noEmit > "$OUT/typecheck.txt" 2>&1
  TSC_STATUS=$?
  ERRS=$(grep -c "error TS" "$OUT/typecheck.txt" 2>/dev/null || echo 0)
  if [[ "$TSC_STATUS" -eq 0 ]]; then
    echo "  ✓ typecheck clean"
  else
    echo "  ✗ $ERRS type errors — see $OUT/typecheck.txt"
    head -20 "$OUT/typecheck.txt" | sed 's/^/    /'
  fi
fi

# --- helpers ----------------------------------------------------------------
open_route() { xcrun simctl openurl booted "${SCHEME}://${1}" >/dev/null 2>&1 || true; }

relaunch() {
  xcrun simctl terminate booted "$APP_ID" >/dev/null 2>&1 || true
  sleep 1
  xcrun simctl launch booted "$APP_ID" >/dev/null 2>&1 || true
  sleep 5
}

login_student() {
  echo "▸ signing in as student (dmdoe@cougarnet.uh.edu) …"
  open_route "/dev-student-login"
  sleep 6
}

# --- run --------------------------------------------------------------------
relaunch
login_student

TOTAL=0
for MODE in $MODES; do
  echo "▸ appearance: $MODE"
  xcrun simctl ui booted appearance "$MODE" >/dev/null 2>&1 || true
  sleep 2
  mkdir -p "$OUT/$MODE"

  for entry in "${ROUTES[@]}"; do
    label="${entry%%|*}"
    route="${entry##*|}"

    if [[ -n "$ONLY" && ",$ONLY," != *",$label,"* ]]; then
      continue
    fi

    printf "    %-22s %s\n" "$label" "$route"
    open_route "$route"
    sleep "$SETTLE"
    xcrun simctl io booted screenshot "$OUT/$MODE/${label}.png" >/dev/null 2>&1 || true
    TOTAL=$((TOTAL + 1))
  done
done

xcrun simctl ui booted appearance light >/dev/null 2>&1 || true

echo
echo "✓ $TOTAL screenshots → expo/$OUT/"
[[ "$RUN_TYPECHECK" -eq 1 ]] && echo "  typecheck → expo/$OUT/typecheck.txt"
echo
echo "Next: share expo/$OUT/ back so the screenshots can be reviewed."
