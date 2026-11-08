# Snapshot freshness and coverage

ID: DATA-SNAPSHOT
Version: 1
Effective: 2026-11-08
Scope: data
Status: current
Source: knowledge/documents/data-snapshot-v1.md

OpsLens serves a fixed synthetic snapshot rather than a rolling event feed. Generator v1 covers 1 July 2026 through 28 September 2026 inclusive in UTC, with an exclusive 29 September boundary and an as-of timestamp of 30 September at midnight UTC. The 10,000-row and 100,000-row exports have different hashes.

When checking whether an apparent change is current, compare dataset version, as-of and filters. A retained result during refresh still refers to its original selection. If Overview and Activity disagree on dataset hash, reload to obtain a consistent snapshot before reconciling.
