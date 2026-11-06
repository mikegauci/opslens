# Investigation flow and screen notes

PLAN-01 · [Issue #1](https://github.com/mikegauci/opslens/issues/1) · M0. These are implementation notes for the [build plan](build-plan.md), governed by the [metric contract](metric-contract.md) and [copilot plan](ai-copilot.md). Refine them in the working React interface; no separate design file is needed.

## Primary investigation

1. Open **Overview** on the last seven complete UTC days in the fixed dataset window, compared with the preceding seven days. Show both date ranges, EUR, settlement basis, dataset timestamp and a persistent **Synthetic data** label. Do not anchor the demo to today's date.
2. Read GGR alongside settled stakes, settled payouts and active settled players. Inspect the daily GGR trend and provider contributions to the period change. The seeded payout spike should be discoverable through these views; its provider and figures come from the seed, not hardcoded presentation data.
3. Select a provider contribution to open **Activity** for that provider, current period, settled status and the same brand scope. Carry the comparison period visibly so the analyst can switch between the two exact slices. A daily trend point opens that UTC day within the active scope. Provide named keyboard-accessible actions and data alternatives for both charts.
4. Open a transaction's details, inspect stake/payout/status and both timestamps, then close back to the invoking row. Browser Back returns to the preceding scope and screen; reloading a shared URL recreates the same filters.
5. Open **Ask copilot** to ask what changed, how GGR is defined, or what to check next. Read verified comparison figures and cited definitions, then follow **View matching transactions** to the exact evidence scope. Higher payouts can explain the arithmetic contribution; an external cause remains a hypothesis unless supported by evidence.

## Screen structure and patterns

| Surface | Content and established shadcn/ui patterns | Narrow layout and focus |
| --- | --- | --- |
| Shared shell | Overview/Activity navigation; page title; Synthetic data, UTC and as-of context; labelled date range, brand and provider controls using Button, Popover/Calendar and Select/Combobox patterns. Active scope stays readable outside collapsed controls. | Wrap controls and show an explicit Filters button when needed. Navigation and filter labels remain visible to assistive technology. URL changes restore browser navigation without resetting focus on every fetch. |
| Overview | Four Card-based metrics; ChartPanel for daily GGR and signed provider EUR contributions; table/text alternatives and clear drill-down buttons. GGR is the visual entry point, with all four metrics equally reachable. | Four/two/one card columns as space allows; charts stack. Never require hover or colour alone to read a value or select a slice. |
| Activity | Scope summary including date basis and status; explicit comparison-period switch when entered from contributions; result count for the full query; Table with sortable headers, incremental loading and a transaction-details button per row. Distinguish loaded rows from total matches. | Keep essential columns (transaction, status, stake, payout) readable; secondary fields move into details. If virtualisation is unreliable with assistive technology, expose an equivalent paginated semantic table with the same scope. |
| Details | Sheet on wide screens, full-width Sheet on narrow screens; labelled title, transaction ID, brand/provider, status, EUR values, placed-at and settled-at timestamps. Missing settlement is shown as “Not settled”. | Move focus into the panel, contain it while modal, support Escape and a visible Close button, then restore the opener. If its row is no longer mounted, restore to the results heading and announce the context. |
| Copilot | Wide-screen side panel; modal Sheet on narrow screens. Visible scope, suggested questions, labelled composer, submit/Stop/Retry controls; evidence Cards and citation buttons opening source title, version and excerpt. | The wide panel is non-modal and does not trap focus. Modal behaviour follows the details rules. Announce progress and answer completion without reading every streamed token or moving focus automatically. |

Start with shared MetricCard, ChartPanel, FilterBar, StatusBadge and AsyncState contracts when concrete reuse appears. Keep transaction fields and query logic in the application.

## Display and scope decisions

- **Numbers:** format integer minor-unit results as EUR; retain the sign of negative GGR and label it plainly. Use signed absolute EUR changes for money and absolute player-count changes. Avoid percentage change in the first interface, including negative baselines. An absent, incomplete or out-of-window comparison shows “Comparison unavailable” with the reason; it is never substituted with zero. An available zero-activity period has real zero totals and is distinguishable from missing data.
- **Dates:** show inclusive calendar dates to people; encode UTC inclusive-start/exclusive-end boundaries in links and requests. Overview and its drill-down always use settled status and settlement time. In the standalone explorer, switching explicitly to placement basis allows pending/void inspection and updates both URL and scope label. Incompatible filters require a visible correction, not a silent scope change.
- **Links:** preserve period bounds, date basis, status, brand/provider IDs and supported sort in Activity URLs; include transaction ID for deep-linked details. Preserve origin scope when returning to Overview. Pagination is query state, not a new analytical scope. Invalid URL filters receive an actionable validation state.
- **Copilot:** bind each question and its evidence to the displayed filter snapshot, comparison bounds and dataset version. If filters change, mark prior answers with their original scope and offer **Use current filters** before another question; do not silently re-scope an in-flight answer. Placement-based questions must clarify eligibility or offer an explicit settlement-based scope before using overview comparison tools. Evidence links use their recorded scope even if the current screen changed.
- **Sources:** separate document citations from calculated evidence. Show document title/version/excerpt for retrieved claims; show figures, periods, filters, EUR/UTC and dataset/as-of context for analytics. Missing or conflicting evidence produces a bounded explanation. Unavailable live AI leaves analytics usable; a recorded example has a persistent Recorded label and fixed scope.

## Initial visual tokens

Use semantic tokens with a neutral light canvas, white surfaces, charcoal text, muted secondary text/borders and an indigo primary action/focus ring. Reserve red/green for labelled adverse/favourable changes and pair them with signs and text; pending, void and settled use named badges. A payout increase is not automatically favourable. Charts use distinguishable series plus labels and a zero reference for signed values.

Start with a 4px spacing base (8/12/16/24/32), 8px surface radius, system sans text at 14px body/12px metadata/24px page heading, tabular numerals and a visible 2px focus ring. Verify contrast and interaction targets in the browser before accepting exact colours or density. These are a small starting vocabulary, not a second design system.

## State review as features land

| State | Required behaviour to review in the browser |
| --- | --- |
| Initial loading / refresh | Stable card/chart/table skeletons with meaningful busy text; retain filters and headings. Ignore responses for superseded queries. |
| Empty | Distinguish no matching transactions from an available period with zero activity; show current scope and a reset-filter action. Never imply an API failure is zero GGR. |
| Error / unavailable | Keep the question or filters and offer a specific Retry action. Isolate a failed panel when possible. Explain unavailable comparisons and AI separately from missing metrics. |
| Stale | Keep previous results visibly labelled with their original scope/as-of time during refresh or failure; disable drill-down until the displayed scope is current, or link explicitly to its displayed snapshot. |
| Sources / streaming | Support missing, conflicting and stale citations, stop, cancellation, retry and quota exhaustion. Incomplete answers remain labelled; validated evidence remains distinguishable from unfinished prose. |
| Keyboard / responsive | Review the full investigation at narrow and wide sizes, chart alternatives, visible focus, modal return focus, browser Back/Forward and accessible table mode. Record actual results in the relevant feature PR. |

PLAN-01 establishes the flow only. Browser, accessibility, performance and live-AI verification remain future work on the implemented features.
