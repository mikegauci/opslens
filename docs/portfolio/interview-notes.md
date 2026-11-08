# Interview notes

## Why settlement time?

Revenue reporting uses settled stakes minus settled payouts in integer EUR minor units. Pending and void bets are excluded. A half-open UTC range puts a transaction settled exactly at midnight in one period. Placement remains an explicit Activity mode for operational questions. Hold uses aggregate GGR divided by aggregate stakes and is unavailable at zero stakes. Active players are distinct within the scope and cannot be summed across providers. [Metric contract and independent oracle](../metric-contract.md)

## How do you keep the chart and table in agreement?

Both use the same settlement scope. The provider or day link encodes the interval, filters and dataset hash. The API validates that scope and pages in a stable sort order. A changed snapshot blocks the pinned drill-down and offers a restart. Cancellation saves work, while separate request ownership guards prevent a late response from replacing the selected scope even if cancellation is ignored. [API contract](../analytics-api.md) · [Development evidence](../development-evidence.md)

## What did 100,000 rows teach you?

Virtualisation limits DOM rows. Server pagination limits transfer and ensures sorting applies to all matching transactions. In the local 100k run, virtualisation held rendered rows at 14 when loaded rows went from 100 to 1,000. Sorting by stake at offset 50,000 still took 83 ms in the database and spilled temporary blocks. Those findings separate rendering, transfer and database costs. [Benchmark methodology](../release-verification.md#10k-and-100k-performance)

## How did you verify accessibility?

Start with a semantic paginated table and chart data alternatives. The browser verifies keyboard activation, Escape and restored focus. Axe caught mismatches between visible action text and accessible names, plus an SVG image role that hid interactive links. The release gate covers four states at each of two widths. The automated findings leave spoken screen-reader behavior open. [Accessibility evidence](../release-verification.md#investigation-and-accessibility)

## Where do retrieval and model judgment belong?

A document passage explains a metric definition or runbook. A read-only analytics result supplies the amounts and exact scope. The model selects evidence IDs, and the server validates the selection and builds the numerical cards. In the recorded path the user can follow the fixed Nova answer back to the matching rows. The synthetic data supports a payout contribution and supplies no operational cause. Live File Search still needs hosted evaluation and human relevance judgments before use in the app. [Copilot design](../ai-copilot.md) · [Retrieval cases](../../evals/retrieval/README.md)

## Describe an AI-assisted mistake and the correction

The initial hold change extended the API and left the Superset verifier comparing the full period object. The gate caught the extra field, and the correction preserved the four-field baseline while keeping independent hold assertions in the literal oracle. Linux CI also found the narrower five-card design still wrapped two values after a local pass. The final change retained a single-line assertion exercised locally and in Linux CI for the five cards. The repo records both corrections and how they were checked. [AI-assisted development evidence](../development-evidence.md)

## Where did component reuse pay off?

`Panel`, `FilterBar`, `StatusBadge` and `AsyncState` are reused in Overview and Activity. `MetricCard` is used by Overview and the Support inbox composition. A consuming app gets typed props and a scoped theme, while retaining control of queries, metric formatting and interactions. Storybook demonstrates keyboard focus, loading, errors and recovery with the same exports. Reuse has been exercised inside this workspace. [UI package and consumer guide](../../packages/ui/README.md)
