# Urza Tower Capital LP

Static fund site for a personal book of sealed trading card product. Originally built as a Base44 React app under the name Sol Ring Capital, converted to plain HTML and vanilla JavaScript so GitHub Pages serves it with no build step, no bundler, and no dependencies.

Live at `https://urzatower.github.io/capital/`.

## Files

`index.html` is the fund page: about, strategy, and the portfolio section with two interactive charts and two tables.

`facts.html` is the fund facts sheet on its own page: vehicle, mandate, portfolio statistics, terms, valuation policy and risk.

`letters.html` is the commentary page. Each letter is a self-contained `<article>` with an anchor id, plus one line in the index list at the top.

`data.js` holds the `DATA` ledger object and is the single source of truth for every number on the site. Both `index.html` and `facts.html` load it.

`app.js` is the rendering layer, shared by both pages. It renders whichever mount points exist on the page, so the same file drives the charts and tables on one page and the facts sheet on the other.

`style.css` is shared by all three pages.

There is no `notes.html` any more. If an older copy is still in the repository, delete it.

`data.json` mirrors `data.js` in machine-readable form, with an explicit column list next to each table. The site does not fetch it; it exists so the ledger can be consumed by other tooling.

`.nojekyll` disables Jekyll processing. Optional.

## Charts

Both exhibits are interactive. Hovering anywhere over a plot snaps a dashed crosshair and a marker to the nearest monthly point and updates the readout line above the chart with the date, NAV, cost, and unrealized return. Moving the pointer off the plot resets the readout to the latest mark. Each chart is also keyboard reachable: tab to it, then use the left and right arrow keys to step month by month. This works on touch as well, since the handlers are on pointer events rather than mouse events.

The two tables are labelled Table 1 and Table 2. Only the charts are exhibits.

## Data

Figures are generated from `02_Data/portfolio_ledger.json` and marked as of 2026-08-28. Invested capital is 8,063.68 USD, marked at 8,436.55 USD, unrealized +4.62%, across 41 positions and 76 sealed units. Holdings sum to the bucket totals and to the summary line, and both tables render an explicit total row computed from the holdings rather than restating the summary. That identity is the first thing to re-check after any edit.

The NAV path between a position's acquisition and its latest verified mark is straight-line modelled. There are no intramonth marks. The first acquisition is 2024-06-06, so the pre-November-2024 section of Exhibit 2 sits on a single 51.30 USD position and the percentages there are not comparable with later periods.

Position weights are shown to one decimal and may not sum to exactly 100.0%. Cost and value columns tie exactly.

## Adding a letter

Open `letters.html`. Copy an existing `<article>` block, give it the next id in sequence (`l004`), update the `meta` line with the letter number and date, write the title and body, and add one line to the index list at the top pointing at the new anchor. Newest letter goes directly under the index, so the page reads most recent first. No build step and no front matter.

The first three seed letters cover the structural framework, the publisher supply picture from Hasbro's reported results, and a self-critical review of the book's own marks. Letters 004 and 005 add a reprint-risk case study from the fund's forum archive and the cash policy. Figures in them are sourced from Hasbro quarterly filings and public marketplace data as of late August 2026 and will date; check them before reusing any number elsewhere.

## Updating the numbers

Edit the `DATA` object in `data.js`, then mirror the change into `data.json`. The summary line, both tables, both totals rows, both charts, and the entire Portfolio group of the facts sheet derive from that object. Nothing else needs touching.

Two things are hardcoded and will need attention as the book grows: the axis tick arrays in `buildCharts`, which should be widened once NAV clears 8,000 USD or unrealized return clears 30%, and the qualitative rows in `buildFacts`, which are statements of practice rather than derived values.

## Deploying

Files sit at the repository root on `main`, with Pages set to deploy from a branch, `main`, `/ (root)`. Committing to `main` triggers a rebuild automatically; it completes in a minute or two and is visible under the Actions tab. Hard refresh after deploying, since GitHub caches the previous HTML and scripts briefly.

## Notes

This site describes a personal collection tracked with fund discipline. It is not an offer to sell securities and not investment advice.
