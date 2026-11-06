# Proposed metric and data contract

This is the portfolio's explicit reporting model. It is not a claim about a particular operator's financial accounting rules. Validate the definitions before implementation and keep the SQL, API, charts, Superset baseline, copilot corpus, and tests aligned.

## Dataset

Generate 100,000 synthetic bet records over a fixed 90-day reporting window, using a committed seed and schema version. Include fictional brand/provider names and anonymous synthetic player IDs. Each generated export has a manifest with its reporting window and hash. Keep large generated files out of Git; commit the generator and small reviewable fixtures.

Fields include ID, player ID, brand ID, provider ID, game category, placed-at timestamp, optional settled-at timestamp, status, currency, stake in minor units, and optional payout in minor units. Status is settled, void, or pending. Use EUR throughout v1 so cross-currency conversion cannot silently corrupt comparisons.

The simulated record is a final-status snapshot at a fixed dataset timestamp. It is not a complete event ledger. Later corrections, bonuses, partial settlements, and cash-out accounting are outside v1 and must not be implied by the UI.

## Default reporting basis

- Overview metrics use settled transactions and settlement timestamps.
- All timestamps are stored as UTC and the reporting UI labels UTC explicitly.
- Date ranges are half-open: inclusive start, exclusive end. Convert an inclusive date-picker end day into the next-day exclusive boundary.
- Chart drill-down preserves exactly the metric's filters and settlement-date basis.
- The standalone explorer can switch to placement-date basis to inspect pending and void transactions. Make this change visible in the URL and UI.
- Cards and charts report the entire filtered result, not just the rows currently loaded in the table.
- Compare equal, complete periods. A zero comparison denominator or unavailable comparison produces an unavailable percentage with an explanation.

## Definitions

| Metric | Definition | Edge cases |
| --- | --- | --- |
| Settled stakes | Sum of stake minor units for eligible settled transactions | Exclude pending and void rows |
| Settled payouts | Sum of payout minor units for the same eligible rows | Payout includes returned stake; settled rows require a valid payout |
| GGR | Settled stakes minus settled payouts | May be negative; use integer arithmetic before formatting |
| Active settled players | Distinct synthetic player IDs with an eligible settled transaction | A player appearing in multiple providers counts once in the overall total |
| Hold percentage, added through the development skill | GGR divided by settled stakes, multiplied by 100 | Unavailable when stakes are zero; may be negative |

Provider contribution to a period change is provider GGR in the current period minus provider GGR in the previous period. Contributions sum to the overall GGR difference, including providers present in only one period. Use absolute EUR contributions to avoid misleading percentage shares when contributions have mixed signs.

Document comparative percentage formatting separately for negative baselines; prefer an absolute EUR change when a percentage would confuse the direction of movement.

## Independent checks

Create a small manually reviewed fixture with known results before writing the production aggregation. Include settled winnings, settled losses, negative GGR, voids, pending rows, repeated player IDs, date-boundary transactions, zero stakes, a provider in only one period, and an empty period.

Reconcile this oracle with API results and independent Superset SQL. Do not derive expected values using the same production implementation under test.

## Seeded investigation

Introduce a known payout spike for one fictional provider in the final complete comparison period. Ensure the provider contribution chart, transaction list, and copilot tool output agree about the change. The copilot may identify higher payouts as the observed contributor; it must not assert an unrecorded external cause such as fraud or a production outage.

## API expectations

Validated filters include from/to timestamps, date basis where supported, known brand/provider IDs, transaction status, allow-listed sorting, and bounded pagination. Reject malformed or incompatible filters. Add a deterministic secondary sort key for stable pagination.

Include the effective filters, reporting basis, currency, dataset version, and as-of timestamp in analytical responses. Keep these available to the copilot as evidence. Define expected behaviour for cancellation and stale responses so a slow previous query cannot overwrite the active view.
