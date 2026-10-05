#!/bin/bash
# Daily rebuild and publish for urzatower/capital.
# Runs on the Mac under launchd at 08:00 local time. Everything it needs
# (the engines, the ledger, the price lake) lives outside the repository,
# which is why this cannot run in a cloud session.
#
# It refuses to publish a degraded build: the marks must tie, the terminal
# export must not shrink, and every exported JSON file must parse.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$HERE/config.sh"
LOGDIR="$HERE/logs"
mkdir -p "$LOGDIR"
LOG="$LOGDIR/$(date +%Y-%m-%d).log"

log() { printf '%s  %s\n' "$(date '+%H:%M:%S')" "$*" | tee -a "$LOG"; }
die() { printf '%s  ABORT: %s\n' "$(date '+%H:%M:%S')" "$*" | tee -a "$LOG" >&2; printf 'log: %s\n' "$LOG" >&2; exit 1; }

# Any failure after the generators have run leaves the tree dirty, and a dirty
# tree would abort tomorrow's run too. Put the published state back, then stop.
# The marks are not lost: they live in 02_Data, and tomorrow re-marks.
restore_and_die() {
  git -C "$REPO" checkout -- . >/dev/null 2>&1 || true
  git -C "$REPO" clean -fdq terminal >/dev/null 2>&1 || true
  die "$*"
}

[ -f "$CONFIG" ] || die "no config.sh. Copy automation/config.sh.example and fill it in."
# shellcheck disable=SC1090
. "$CONFIG"

: "${WORKSPACE:?set WORKSPACE in config.sh}"
: "${REPO:?set REPO in config.sh}"
: "${PYTHON:?set PYTHON in config.sh}"
: "${TERMINAL_BUILD:?set TERMINAL_BUILD in config.sh}"
MIN_API_FILES_RATIO="${MIN_API_FILES_RATIO:-0.90}"

[ -d "$WORKSPACE/01_Engines" ] || die "no 01_Engines under WORKSPACE=$WORKSPACE"
[ -f "$WORKSPACE/02_Data/portfolio_ledger.json" ] || die "no 02_Data/portfolio_ledger.json under $WORKSPACE"
[ -f "$REPO/data.js" ] || die "REPO=$REPO does not look like the capital clone"
command -v "$PYTHON" >/dev/null 2>&1 || [ -x "$PYTHON" ] || die "PYTHON=$PYTHON is not executable"

log "=== daily update $(date '+%Y-%m-%d %H:%M:%S %Z') ==="

# 1. Start from a clean main.
cd "$REPO"
[ -z "$(git status --porcelain)" ] || die "repo has uncommitted changes. Resolve by hand, then rerun."
git checkout main >>"$LOG" 2>&1
git pull --ff-only origin main >>"$LOG" 2>&1
log "repo clean on main at $(git rev-parse --short HEAD)"

API_DIR="$REPO/terminal/data/api"
BEFORE=$(find "$API_DIR" -name '*.json' -type f | wc -l | tr -d ' ')
log "terminal api files before: $BEFORE"

# 2. Re-mark the book from the price lake, then regenerate data.js and data.json.
cd "$WORKSPACE"
log "marking to market"
"$PYTHON" 01_Engines/fund_engine/mark_to_market.py >>"$LOG" 2>&1 \
  || die "mark_to_market.py failed. Nothing was committed."
log "building site data"
"$PYTHON" 01_Engines/report_engine/capital_site_data.py --out "$REPO" >>"$LOG" 2>&1 \
  || restore_and_die "capital_site_data.py failed. Nothing was committed."

# 3. The builder already refuses to write on a broken identity. Check it again here,
#    because a stale data.js is worse than a missed day.
"$PYTHON" - "$REPO/data.json" >>"$LOG" 2>&1 <<'PY' || restore_and_die "ledger identities do not tie. Nothing was committed."
import json, sys
d = json.load(open(sys.argv[1]))
s, hc, H = d["summary"], d["holdings_columns"], d["holdings"]
ci, vi, pi = hc.index("cost"), hc.index("value"), hc.index("priced")
assert abs(round(sum(r[ci] for r in H), 2) - s["invested"]) < 0.01, "holdings cost != invested"
assert abs(round(sum(r[vi] for r in H), 2) - s["nav"]) < 0.01, "holdings value != nav"
bc, B = d["buckets_columns"], d["buckets"]
bci, bvi = bc.index("cost"), bc.index("value")
assert abs(round(sum(r[bci] for r in B), 2) - s["invested"]) < 0.01, "buckets cost != invested"
assert abs(round(sum(r[bvi] for r in B), 2) - s["nav"]) < 0.01, "buckets value != nav"
assert len(H) == s["positions"], "holdings count != positions"
assert sum(1 for r in H if r[pi] is True) == s["marked"], "priced count != marked"
bad = [r[0] for r in H if r[pi] is not True and abs(r[ci] - r[vi]) > 0.005]
assert not bad, "unpriced position not carried at cost: %s" % bad[:3]
print("identities tie: nav %.2f invested %.2f positions %d marked %d asof %s"
      % (s["nav"], s["invested"], s["positions"], s["marked"], s["asof"]))
PY
log "ledger identities tie"

# 4. Terminal export. On failure or shrinkage, put the committed build back.
log "building terminal"
if ! ( cd "$WORKSPACE" && eval "$TERMINAL_BUILD" ) >>"$LOG" 2>&1; then
  restore_and_die "terminal build failed. Restored the published state; nothing was committed."
fi

AFTER=$(find "$API_DIR" -name '*.json' -type f | wc -l | tr -d ' ')
FLOOR=$("$PYTHON" -c "print(int($BEFORE * $MIN_API_FILES_RATIO))")
log "terminal api files after: $AFTER (floor $FLOOR)"
if [ "$AFTER" -lt "$FLOOR" ]; then
  restore_and_die "terminal export wrote $AFTER files against a floor of $FLOOR. Restored the published state; nothing was committed."
fi

"$PYTHON" - "$API_DIR" >>"$LOG" 2>&1 <<'PY' || restore_and_die "terminal export has unparseable or empty JSON. Restored the published state; nothing was committed."
import glob, json, os, sys
bad, empty = [], []
for f in glob.glob(os.path.join(sys.argv[1], "*.json")):
    try:
        d = json.load(open(f))
    except Exception as e:
        bad.append((os.path.basename(f), str(e)[:60])); continue
    if d in ({}, [], None):
        empty.append(os.path.basename(f))
print("api files parsed, %d unparseable, %d empty" % (len(bad), len(empty)))
for x in bad[:5]:
    print("BAD", x)
for x in empty[:5]:
    print("EMPTY", x)
assert not bad and not empty
PY
log "terminal export parses clean"

STATUS="$API_DIR/status.json"
BUILT=$("$PYTHON" -c "import json;print(json.load(open('$STATUS'))['built_at'])")
TODAY=$(date +%Y-%m-%d)
case "$BUILT" in
  "$TODAY"*) log "terminal built_at $BUILT" ;;
  *) restore_and_die "status.json says built_at $BUILT, not today. Restored the published state; nothing was committed." ;;
esac

# 5. Optional PDF rebuild. A failure here is not worth losing the day's marks,
#    so it reverts the PDFs and carries on.
if [ -n "${PDF_BUILD:-}" ]; then
  log "building pdfs"
  if ! ( cd "$WORKSPACE" && eval "$PDF_BUILD" ) >>"$LOG" 2>&1; then
    git -C "$REPO" checkout -- '*.pdf' || true
    log "WARNING: pdf build failed. Kept yesterday's PDFs and carried on."
  fi
fi

# 6. Publish. Pages redeploys on push to main.
cd "$REPO"
if [ -z "$(git status --porcelain)" ]; then
  log "nothing changed. No commit, no push."
  exit 0
fi
NAV=$("$PYTHON" -c "import json;print(json.load(open('$REPO/data.json'))['summary']['nav'])")
git add -A
git commit -q -m "Update $TODAY: NAV $NAV, terminal build $BUILT"
log "committed $(git rev-parse --short HEAD)"

for attempt in 1 2 3 4 5; do
  if git push -u origin main >>"$LOG" 2>&1; then
    log "pushed"
    break
  fi
  [ "$attempt" = 5 ] && die "push failed five times. The commit is local; push it by hand."
  DELAY=$((2 ** attempt))
  log "push failed, retrying in ${DELAY}s"
  sleep "$DELAY"
done

log "=== done: NAV $NAV, $AFTER api files ==="
