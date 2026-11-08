# Three-minute investigation walkthrough

[Watch or download the MP4](investigation.mp4). The recording uses the local production build with 100,000 synthetic transactions and on-screen narration. The app runs without model credentials.

| Time | Transcript |
| --- | --- |
| 0:00 | **Detect the change.** OpsLens uses 100,000 synthetic transactions. This walkthrough follows the final complete UTC week, 22–28 September 2026. |
| 0:14 | **Compare equal reporting periods.** Settled stakes minus settled payouts gives GGR. It moved from €116,769 to −€965,245, a change of −€1,082,014. |
| 0:29 | **Check the reporting basis.** The Overview uses settlement time and excludes pending and void bets. The date range, basis and snapshot follow the drill-down. |
| 0:41 | **Find the largest contribution.** Nova contributed −€1,078,029 to the weekly movement. Each provider bar compares its GGR with the preceding equal week. |
| 0:56 | **Inspect the transactions.** Open **View Nova activity**. The link carries the exact UTC window, provider, settled status and dataset hash to the server-backed table. |
| 1:04 | **Follow the scope into Activity.** The table shows one page at a time. The server filters and sorts the full matching set before it sends a page. |
| 1:19 | **Open an individual record.** Open the first transaction with Enter. The details show the transaction’s timestamps and amounts in the current scope. |
| 1:25 | **Inspect, then return.** Placement and settlement have separate timestamps. Escape returns focus to the transaction’s Details control. |
| 1:42 | **Open the recorded Copilot example.** This demo runs without a model key. The labelled example is a fixed answer with its original date range and filters. |
| 1:56 | **Read the evidence in scope.** The answer gives the current and comparison GGR, Nova’s contribution and the fixed snapshot behind those figures. |
| 2:12 | **Separate contribution from cause.** Nova accounts for most of the movement. The synthetic data shows a payout spike and contains no operational incident evidence. |
| 2:28 | **Follow the evidence link.** The recorded answer links to the settled Nova transactions for the same UTC week and dataset version. |
| 2:40 | **The evidence leads back to the rows.** The date window, settlement basis and dataset survived both routes to the table. The case study links to the matching SQL and Superset results. |

## Try the same path locally

1. [Seed 100,000 rows and run the production build](../runtime.md#fresh-checkout). Open the [local Overview](http://127.0.0.1:3000/) and leave the default scope selected.
2. In **Provider contribution**, open **View Nova activity**. Open the first **Details** control, then press Escape to return to the table.
3. Open **Ask Copilot**, expand **Recorded example · GGR change and Nova**, and select **View Nova transactions in the recorded scope**. Confirm **Nova**, **Settled**, and **22–28 September 2026 UTC** on Activity.

[Case study and Superset comparison](case-study.md)
