# Triage empty and zero-valued metrics

ID: RUN-EMPTY
Version: 1
Effective: 2026-11-08
Scope: runbooks
Status: current
Source: knowledge/documents/run-empty-v1.md

First check that the request completed and that the active snapshot covers the selected UTC range. Within coverage an empty scope has no eligible settled rows. A valid settled slice can instead have zero GGR because stakes and payouts match.

Check the eligible rows with the same filters before relaxing the selection. In generator v1, 15 August 2026 UTC is a deliberate no-activity day. A zero comparison denominator still makes percentage change unavailable.
