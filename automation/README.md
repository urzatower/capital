# Daily update at 08:00

The daily rebuild has to run on the Mac. The engines, the ledger and the price
lake live in `01_Engines`, `02_Data` and the parquet lake, none of which are in
this repository, so a cloud session has nothing to build from. That is what went
wrong on 2026-09-19: a cloud run published an empty terminal and deleted 25,747
files, and the build had to be restored from the Mac by hand.

`daily_update.sh` is the Mac side. It re-marks the book, regenerates the site
data, rebuilds the terminal, checks the result, and only then commits and pushes.
It refuses to publish a degraded build:

- the holdings, the buckets and the summary must tie to the cent, and every
  unpriced position must be carried at cost;
- the terminal export must keep at least `MIN_API_FILES_RATIO` of the api file
  count already published, which catches a failed export step;
- every exported JSON file must parse and be non-empty;
- `status.json` must carry today's `built_at`.

On any of those it puts the published state back, leaves the tree clean and
commits nothing, so the site keeps yesterday's good build and the next morning's
run starts from a clean repository. The marks are never lost, since they live in
`02_Data` and the next run re-marks from the lake.

## Install

```
cd <this repo>
cp automation/config.sh.example automation/config.sh
$EDITOR automation/config.sh          # five values: WORKSPACE, REPO, PYTHON, TERMINAL_BUILD, PDF_BUILD

# dry run once by hand before handing it to launchd
bash automation/daily_update.sh

sed "s|__REPO__|$PWD|g" automation/com.urzatower.capital.daily.plist \
  > ~/Library/LaunchAgents/com.urzatower.capital.daily.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.urzatower.capital.daily.plist
launchctl print gui/$(id -u)/com.urzatower.capital.daily | head -20
```

`config.sh` is git-ignored, so machine paths stay off GitHub.

`TERMINAL_BUILD` is the one value this repository cannot supply, because the
terminal exporter is not documented here. Put in the exact command that writes
`terminal/data/api`, run from `WORKSPACE`, and point its output at `$REPO`.

## Operating it

Run on demand: `launchctl kickstart -p gui/$(id -u)/com.urzatower.capital.daily`

Stop it: `launchctl bootout gui/$(id -u)/com.urzatower.capital.daily`

After editing the plist, bootout then bootstrap again. `launchctl load` is the
old syntax and is deprecated on current macOS.

Logs land in `automation/logs/YYYY-MM-DD.log`, one file per day, with launchd's
own stdout and stderr next to them. Also git-ignored.

`StartCalendarInterval` reads the Mac clock rather than UTC, so 08:00 stays 08:00
across the EDT to EST change on 2026-11-01 with no edit. A Mac asleep at 08:00
runs the job when it next wakes; a Mac powered off misses the day, and the next
morning's run picks up both days of marks, since the path is rebuilt from the
lake rather than accumulated.

## The 08:00 choice

The ECB publishes its daily reference rate around 16:00 CET, which is 10:00 in
Miami on EDT and 10:00 on EST as well. An 08:00 run therefore stamps the
previous business day's EURUSD, which is what `status.json` already records and
is correct for a book marked in dollars. Move the job to 10:30 to pick up the
same-day rate.
