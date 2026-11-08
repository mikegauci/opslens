# Independent metric oracle

`metric-oracle.json` was authored before production aggregation exists. Expected values are literal minor-unit amounts, with arithmetic reviewed below directly from the twelve rows. This is an AI-assisted self-review, not an external human/peer sign-off. The fixture does not import the random generator, money helper, or any production metric calculation. PLAN-04 and the independent Superset baseline must reconcile against it; do not regenerate expectations from those implementations.

All times are UTC. Previous = [15 September 2026, 22 September 2026); current = [22 September 2026, 29 September 2026). `placed_at` and `settled_at` are deliberately different for row l.

| Row | Player | Provider | Period/status | Stake | Payout | GGR |
| --- | --- | --- | --- | ---: | ---: | ---: |
| a | p1 | nova | previous, at inclusive start | 1000 | 0 | 1000 |
| b | p1 | orbit | previous, last millisecond | 500 | 1000 | -500 |
| c | p2 | nova | previous, zero stake | 0 | 200 | -200 |
| d | p1 | nova | current, at inclusive start | 1000 | 3000 | -2000 |
| e | p3 | orbit | current; summit brand | 2000 | 0 | 2000 |
| f | p3 | nova | current | 500 | 500 | 0 |
| g | p4 | pulse | current, zero activity in money | 0 | 0 | 0 |
| h | p5 | nova | at exclusive current end; excluded | 100 | 0 | 100 |
| i | p6 | nova | before previous start; excluded | 200 | 0 | 200 |
| j | p7 | orbit | pending; excluded from settled metrics | 4000 | null | — |
| k | p8 | orbit | void; excluded from settled metrics | 9000 | null | — |
| l | p2 | nova | placed in previous, settled at current start | 100 | 500 | -400 |

Previous: stakes 1000 + 500 + 0 = **1500**; payouts 0 + 1000 + 200 = **1200**; GGR **300**; players {p1,p2} = **2**, even though p1 uses two providers.

Current: stakes 1000 + 2000 + 500 + 0 + 100 = **3600**; payouts 3000 + 0 + 500 + 0 + 500 = **4000**; GGR **-400**; players {p1,p2,p3,p4} = **4**. p3 counts once overall. Excluding summit row e gives harbor stakes **1600**, payouts **4000**, GGR **-2400**, players **4**. Pulse has one eligible player and zero stakes/payouts/GGR: hold is unavailable, not zero. The 26–27 September slice has no rows, all totals zero, no active players and unavailable hold.

Hold uses the aggregate period amounts above. Previous **20%** (300 ÷ 1500 × 100), current **−11.111…%** (−400 ÷ 3600 × 100), and current Harbor **−150%** (−2400 ÷ 1600 × 100). The current versus previous difference is **−31.111… percentage points**. Nova on 24 September contains only row f and has **0%** hold (0 ÷ 500 × 100). Pulse and the empty slice both have undefined hold. Nova on 20 September contains only row c and has undefined hold despite paying out 200 on zero stakes.

Provider changes: nova previous GGR 1000 - 200 = **800**, current -2000 + 0 - 400 = **-2400**, change **-3200**. Orbit previous **-500**, current **2000**, change **2500**. Pulse is present only in current and contributes **0**. Sum -3200 + 2500 + 0 = **-700**, matching -400 - 300. Percentages from a zero comparison baseline are unavailable; no misleading provider percentage shares are specified.

Placement-basis current contains d,e,f,g,j,k (**6** rows, all statuses); l belongs to the previous placement period. Current settled-basis contains d,e,f,g,l (**5** rows). This distinction must survive explorer links in PLAN-04/07.

`pnpm db:verify` temporarily loads this oracle in a rollback-only owner transaction, runs independently written SQL as the application role, checks the literals, and restores the bulk dataset by rollback. This verifies the oracle against PostgreSQL, not a production analytics endpoint. Invalid payout, negative stake, currency and settlement-before-placement updates must fail database constraints.
