# Investigate a boundary discrepancy

ID: RUN-BOUNDARY
Version: 1
Effective: 2026-11-08
Scope: runbooks
Status: current
Source: knowledge/documents/run-boundary-v1.md

If two views disagree near midnight, write both bounds as UTC timestamps and check whether each view uses placement or settlement. A bet placed before the inclusive start can count if it settled exactly at that start. A settlement exactly at the exclusive end counts in the following interval.

Compare the individual timestamp and eligibility fields in Activity. Keep the snapshot hash fixed while reconciling. A local-time export may label the same instant with a different calendar date.
