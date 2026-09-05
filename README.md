# Urza Tower Capital LP

Static fund site for a personal book of sealed trading card product. Originally built as a Base44 React app under the name Sol Ring Capital, converted to plain HTML and vanilla JavaScript so GitHub Pages serves it with no build step, no bundler, and no dependencies.

Live at `https://urzatower.github.io/capital/`.

## Files

`index.html` is the fund page: about, strategy, and the portfolio section with two interactive charts and two tables.

`facts.html` is the fund facts sheet on its own page: vehicle, mandate, portfolio statistics, terms, valuation policy and risk.

`letters.html` is the commentary index page and holds the table of contents of all letters.

`letters/` holds the individual letter pages (`001.html`, `002.html`, etc.), each formatted as a clean standalone article with previous/next letter pagination and links back to the fund.

`data.js` holds the `DATA` ledger object and is the single source of truth for every number on the site. Both `index.html` and `facts.html` load it.

`app.js` is the rendering layer, shared by both pages. It renders whichever mount points exist on the page, so the same file drives the charts and tables on one page and the facts sheet on the other.

`style.css` is shared across all pages.

There is no `notes.html` any more. If an older copy is still in the repository, delete it.

`data.json` mirrors `data.js` in machine-readable form, with an explicit column list next to each table. The site does not fetch it; it exists so the ledger can be consumed by other tooling.

`.nojekyll` disables Jekyll processing. Optional.

## Charts

Both exhibits are interactive. Hovering anywhere over a plot snaps a dashed crosshair and a marker to the nearest monthly point and updates the readout line above the chart with the date, NAV, cost, and unrealized return. Moving the pointer off the plot resets the readout to the latest mark. Each chart is also keyboard reachable: tab to it, then use the left and right arrow keys to step month by month. This works on touch as well, since the handlers are on pointer events rather than mouse events.

The two tables are labelled Table 1 and Table 2. Only the charts are exhibits.

## Data

Figures are generated from `02_Data/portfolio_ledger.json` and marked as of 2026-09-04. Invested capital is 8,063.68 USD, marked at 7,927.32 USD, unrealized -1.69%, across 41 positions and 76 sealed units.

**Marking policy.** A position is marked only from an observed marketplace sale price (TCGplayer market, latest observation in `02_Data/parquet/price_history.parquet`). Dealer asks and dealer bids are not substituted for a market price. A position the feed does not cover is carried at cost and flagged `priced: false`, shown as "at cost" and asterisked in Table 2. Currently 17 of 41 positions, 39.7% of cost basis, are genuinely marked; The Hobbit, Tales of Middle-earth and Spider-Man buckets have no feed coverage at all and sit entirely at cost. Holdings sum to the bucket totals and to the summary line, and both tables render an explicit total row computed from the holdings. That identity is the first thing to re-check after any edit.

**What changed on 2026-09-04.** Every mark previously published here was produced by `01_Engines/fund_engine/urza_tower_ingest.py` as `unit_cost * (1 + cagr) ** years_held`, using hardcoded rates (18% vintage, 22% Hobbit and Marvel, 25% Tales of Middle-earth, 12% other) and floored at cost by `max(unit_cost, ...)`. Those were assumptions, not prices, and the floor made a markdown arithmetically impossible, which is why the book always read green. The formula is removed; the ingest now records cost basis only, and `01_Engines/fund_engine/mark_to_market.py` does the valuation from the price lake. Re-mark with `python3 01_Engines/fund_engine/mark_to_market.py` (add `--dry-run` to preview); it backs up the ledger to `07_Archive/ledger_backups/` before writing.

The NAV path between a position's acquisition and its latest verified mark is straight-line modelled. There are no intramonth marks. The first acquisition is 2024-06-06, so the pre-November-2024 section of Exhibit 2 sits on a single 51.30 USD position and the percentages there are not comparable with later periods.

Position weights are shown to one decimal and may not sum to exactly 100.0%. Cost and value columns tie exactly.

## Adding a letter

Create the next letter page in `letters/` (e.g. `letters/023.html`) using the template from an existing letter. Update the title, metadata line (letter number, date, Miami dateline), article body, and pagination links (`prev` and `next`). Then, add one line at the top of the `index-list` in `letters.html` pointing to `letters/023.html`. No build step and no front matter.

There are twenty-two letters, dated 30 June 2026 through 4 September 2026, written in the register of a fund memo rather than a research note: each opens on a story or a question and reaches its argument several paragraphs in. They run roughly 1,200 to 1,800 words.

The sequence moves from framework (001 to 004: the two supply flows, singles versus sealed, float destruction, the junk wax analogy) through the publisher (005, 008, 010: the issuer's accounts, print-to-demand, reprint velocity), through evidence from the archive (007, 009, 011, 013, 018: the fetchland reprint experiment, the marginal buyer, whether a floor exists, public price discovery, dead shelf product), through self-criticism of specific positions (006, 012, 014, 015, 016, 017: the display bought at the top, the Fallen Empires marking error, the second Tolkien bite, why every position being green proves nothing, counterparty risk, the Target shelf buy), and closes on policy (019 cash, 020 the falsification conditions for the whole book).

Two sourcing notes. Portfolio figures come from `02_Data/portfolio_ledger.json` and are marked as of 2026-08-30. Historical market episodes come from the fund's archive of 316 public forum threads spanning 2011 to 2026, and are referenced by date and subject only, never by author, because those threads were written by private individuals. Hasbro figures come from published quarterly results. All of it will date; check any number before reusing it elsewhere.

## Updating the numbers

Edit the `DATA` object in `data.js`, then mirror the change into `data.json`. The summary line, both tables, both totals rows, both charts, and the entire Portfolio group of the facts sheet derive from that object. Nothing else needs touching.

Two things are hardcoded and will need attention as the book grows: the axis tick arrays in `buildCharts`, which should be widened once NAV clears 8,000 USD or unrealized return clears 30%, and the qualitative rows in `buildFacts`, which are statements of practice rather than derived values.

## Deploying

Files sit at the repository root on `main`, with Pages set to deploy from a branch, `main`, `/ (root)`. Committing to `main` triggers a rebuild automatically; it completes in a minute or two and is visible under the Actions tab. Hard refresh after deploying, since GitHub caches the previous HTML and scripts briefly.

## Notes

This site describes a personal collection tracked with fund discipline. It is not an offer to sell securities and not investment advice.
