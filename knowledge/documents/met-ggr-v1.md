# Gross gaming revenue

ID: MET-GGR
Version: 1
Effective: 2026-11-08
Scope: metrics
Status: current
Source: knowledge/documents/met-ggr-v1.md

OpsLens GGR is the sum of settled stakes minus the sum of settled payouts for the selected settlement interval, brand and provider. Payout includes any returned stake. Both sums use integer EUR minor units before conversion for display.

A negative GGR means eligible payouts exceeded eligible stakes. Zero GGR can arise from equal stakes and payouts, including an empty scope. Check eligible row counts before interpreting zero. This is the project's synthetic reporting measure and carries no information about fees, bonuses or accounting profit.
