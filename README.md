# Urza Tower Capital LP

Static fund site for a personal book of sealed trading card product. Originally built as a Base44 React app under the name Sol Ring Capital, converted to plain HTML so GitHub Pages serves it with no build step, no bundler, and no dependencies.

Live at `https://urzatower.github.io/capital/`.

## Files

`index.html` is the fund page: about, strategy, portfolio with two charts and two tables, a fund facts sheet, and contact. All portfolio data lives in a `DATA` object inside the inline script, and every number on the page, including the concentration statistics and both table totals, is derived from it at render time.

`notes.html` is the commentary page, linked from the fund page but not part of it. Each note is a self-contained `<article>` with an anchor id, plus one line in the index list at the top.

`style.css` is shared by both pages. Editing it changes both.

`data.json` is the same portfolio payload in machine-readable form, with an explicit column list next to each table. The site does not fetch it; it exists so the ledger can be consumed by other tooling without parsing the page.

`.nojekyll` disables Jekyll processing. Optional, but it removes a class of surprises if underscore-prefixed directories are added later.

## Data

Figures are generated from `02_Data/portfolio_ledger.json` and marked as of 2026-08-28. Invested capital is 8,063.68 USD, marked at 8,436.55 USD, unrealized +4.62%, across 41 positions and 76 sealed units. Holdings sum to the bucket totals and to the summary line, and both tables render an explicit total row that recomputes from the holdings rather than restating the summary. That identity is the first thing to re-check after any edit.

The NAV path between a position's acquisition and its latest verified mark is straight-line modelled. There are no intramonth marks. The first acquisition is 2024-06-06, so the pre-November-2024 section of Exhibit 2 sits on a single 51.30 USD position and the percentages there are not comparable with later periods.

Position weights are shown to one decimal and may not sum to exactly 100.0%. Cost and value columns tie exactly.

## Adding a note

Open `notes.html`. Copy an existing `<article>` block, give it the next id in sequence, update the `meta` line with the note number and date, write the title and body, and add one line to the index list at the top pointing at the new anchor. Newest note goes directly under the index, so the page reads most recent first. No build step and no front matter.

## Updating the numbers

Edit the `DATA` object inside the `<script>` block in `index.html`, then mirror the change into `data.json`. The summary line, both tables, both totals rows, the fund facts sheet, and both charts derive from that object.

Two things are hardcoded and will need attention as the book grows: the axis tick arrays `navTicks` and `perfTicks` in `buildCharts`, which should be widened once NAV clears 8,000 USD or unrealized return clears 30%, and the qualitative rows in `buildFacts`, which are prose rather than derived values.

## Deploying

Files sit at the repository root on `main`, with Pages set to deploy from a branch, `main`, `/ (root)`. Committing to `main` triggers a rebuild automatically; it completes in a minute or two and is visible under the Actions tab. Hard refresh after deploying, since GitHub caches the previous HTML briefly.

## Notes

This site describes a personal collection tracked with fund discipline. It is not an offer to sell securities and not investment advice.
