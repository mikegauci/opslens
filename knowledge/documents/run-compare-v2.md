# Compare complete periods

ID: RUN-COMPARE
Version: 2
Effective: 2026-11-08
Scope: runbooks
Status: current
Source: knowledge/documents/run-compare-v2.md

For a current GGR comparison, use equal, complete periods with identical UTC settlement basis, currency and dimension filters. A three-day selection requires a complete three-day comparison interval. Check coverage before treating missing comparison days as zero.

Use absolute EUR change for a negative prior GGR. A zero denominator or unavailable prior period makes percentage change unavailable. Record both period boundaries when sharing the result. This replaces the archived calendar-week draft RUN-COMPARE v1.
