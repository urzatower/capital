# Urza Tower Capital LP

Single-page fund site for a personal book of sealed trading card product. Static build of the Base44 app `Sol Ring Capital`, converted from React to plain HTML so it can be served directly by GitHub Pages with no build step, no bundler, and no dependencies.

## Contents

`index.html` is the entire site. Markup, CSS, portfolio data, and the two SVG charts are self-contained in that one file. It opens correctly from the local filesystem as well as from a web server.

`data.json` is the same portfolio payload in machine-readable form: summary, monthly NAV series, strategy buckets, and the 41-position holdings table, each with an explicit column list. The site does not fetch it. It exists so the ledger can be consumed by other tooling without parsing the page.

`.nojekyll` disables Jekyll processing on GitHub Pages. Not strictly required here, but it removes a class of surprises if directories starting with an underscore are added later.

## Data

Figures are generated from `02_Data/portfolio_ledger.json` and marked as of 2026-08-28. Invested capital is 8,063.68 USD, marked at 8,436.55 USD, unrealized +4.62%. Holdings sum to the bucket totals and to the summary line; that identity is worth re-checking after any edit.

The NAV path between a position's acquisition and its latest verified mark is straight-line modelled. There are no intramonth marks. The first acquisition in the book is 2024-06-06, so the pre-November-2024 section of the chart sits on a single 51.30 USD position and the percentage swings there are not meaningful.

## Deploying to GitHub Pages

Upload `index.html`, `data.json`, and `.nojekyll` to the root of the `urzatower/capital` repository on the default branch. In the repository, go to Settings, then Pages, set Source to "Deploy from a branch", select the default branch and the `/ (root)` folder, and save. The site publishes at `https://urzatower.github.io/capital/` within a couple of minutes.

One constraint to settle before uploading: the repository is configured as Private. GitHub Pages will not publish from a private repository owned by an organization on the free plan. Set the repository to Public, or move the org to GitHub Team.

## Updating the numbers

Edit the `DATA` object inside the `<script>` block in `index.html` and mirror the change into `data.json`. The summary line, the bucket table, the holdings table, the position count, and both charts all derive from that object, so nothing else needs touching. Axis tick arrays `navTicks` and `perfTicks` are fixed and should be widened once NAV clears 8,000 USD or unrealized return clears 30%.

## Notes

This page describes a personal collection tracked with fund discipline. It is not an offer to sell securities and not investment advice.
