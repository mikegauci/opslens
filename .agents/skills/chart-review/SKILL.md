---
name: chart-review
description: Review an OpsLens analytics chart for accurate visual encoding, accessible data and correct Activity drill-down. Use for new or changed charts or a review of an existing chart.
---

Start with the chart or route, the question it should answer and a reproducible filter slice. Use `docs/metric-contract.md` and the literal oracle under `data/fixtures/` to establish the expected data. For a comparison, include the previous interval and at least one edge case such as a negative value, a zero, or unavailable data.

- Compare the API values with the plotted marks and the visible data table. Check scales, zero references, signs, units, ordering, UTC interval labels and whether missing values can be mistaken for zero. For provider contributions, check that the signed changes sum to the overall change in the same scope.
- In the running Overview at a wide and a narrow viewport, check labels, clipping, horizontal overflow and the data alternative. Use the keyboard to find and activate a named chart or table action. Follow it through Activity and check the resulting rows against the interval, brand/provider, settlement basis, status and dataset hash. Check that stale or mismatched data disables drill-down.
- Reuse the oracle-backed setup in `tests/e2e/overview.spec.ts` for regression checks. In a review, report the observed scope, viewport, expected and actual result, and reproduction steps for each finding. Distinguish browser keyboard and accessibility-tree checks from a screen-reader walkthrough.
