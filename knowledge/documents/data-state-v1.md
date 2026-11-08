# Transaction states and Activity basis

ID: DATA-STATE
Version: 1
Effective: 2026-11-08
Scope: data
Status: current
Source: knowledge/documents/data-state-v1.md

Settled rows have a valid settlement timestamp and payout. Void and pending rows are excluded from the settled revenue and player calculations. The synthetic snapshot records their final state as of its cut-off and cannot reconstruct intermediate changes.

Use placement-date mode in Activity to inspect pending or void bets. A row found by placement time can fall outside the corresponding settlement window. Use settlement basis and settled status when checking an Overview figure.
