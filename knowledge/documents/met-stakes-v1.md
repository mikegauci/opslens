# Settled stakes and payouts

ID: MET-STAKES
Version: 1
Effective: 2026-11-08
Scope: metrics
Status: current
Source: knowledge/documents/met-stakes-v1.md

Settled stakes measure the money wagered on eligible rows. Settled payouts measure the entire amount credited for those same rows, including any returned stake. A settled loss can have a zero payout. A pending payout is unknown.

Reconcile both totals with the same UTC settlement window and brand/provider filters. The Activity page only loads a slice of the result at a time. Use the Overview aggregate for the entire selection, even when a table page contains few or no transactions.
