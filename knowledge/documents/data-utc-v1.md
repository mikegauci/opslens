# UTC windows and settlement basis

ID: DATA-UTC
Version: 1
Effective: 2026-11-08
Scope: data
Status: current
Source: knowledge/documents/data-utc-v1.md

A reporting window includes its start and excludes its end in UTC. To include all of 24 September 2026, use 2026-09-24T00:00:00Z through the exclusive boundary 2026-09-25T00:00:00Z. A row at the latter midnight belongs to the next day.

Overview uses the settlement timestamp. An earlier placement can still be eligible if settlement falls inside the window. Preserve the settlement basis and exact UTC boundaries when opening the matching Activity slice.
