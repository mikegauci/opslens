# PLAN-11 copilot evaluation

The [32 cases](cases.json) contain 23 development and nine held-out cases reserved before behavior changes. The suite includes 18 analytics, eight retrieval and six simulated cases. Scope aliases expand into exact filters and the 100,000-row dataset hash. Expected numeric results were calculated independently from the generated CSV using UTC half-open filtering, distinct player IDs, and integer minor units. Case review is pending human sign-off. The retrieval cases use the [versioned relevance labels](../retrieval/cases.json).

## Run the checks

- `pnpm test` simulates provider streams, source results and failures. It checks scope isolation, unknown evidence IDs, tool arguments and budgets, cancellation, ambiguity, outage handling and injection containment. `pnpm check` also runs the production browser fallback check.
- With the disposable 100,000-row dataset, run `OPSLENS_QUOTA_TEST=1 pnpm db:verify:copilot`. It executes the analytical cases through the actual copilot API and PostgreSQL with scripted model choices, and verifies quota enforcement.
- With an API key, a configured Responses model and the same seeded database, run `pnpm copilot:eval --live` for the five held-out analytical cases twice each. Specify `development`, `all`, or one analytics case ID after `--live` to select another bounded set. The runner is sequential, uses no retries and halts on provider authorization or quota errors.
- With the hosted corpus ready, run `pnpm knowledge:eval` to measure File Search separately. It reports retrieval precision/recall, citations, elapsed latency, usage and missing required sources. This probe measures retrieval and citation transport. A reviewer checks the cited passages against the answer.

The analytics report includes requested and returned model IDs, dependency versions, prompt and case versions, corpus and dataset hashes, first stream event, first evidence or completed answer, total time, tool calls, token usage and per-case outcomes for both repetitions. It writes only to the ignored `evals/runs/private/` directory. Optional `OPSLENS_EVAL_USD_PER_MILLION` supplies the configured model's current uncached input, cached input and output rates as a JSON array. The report calculates estimated USD from usage and keeps invoiced cost separate. Record billed cost from account usage if available. Missing usage, rates or invoice data stay unmeasured.

## Human review and release

Review the case scope and expected evidence first. For each live answer, mark pass or fail on the following dimensions and cite the evidence behind any failure.

- **Numeric and link correctness.** Check minor units, period boundaries, filters, dataset hash and the scope of any Activity link.
- **Relevance and citation support.** Match each material document claim to a current cited excerpt. Historical material may appear in the version-comparison retrieval probe only. Mark missing, stale or irrelevant evidence as failures where the case expects support.
- **Completeness and uncertainty.** Check that the answer addresses the question or asks for the needed clarification. For mixed questions, evaluate the numeric and documentary portions separately. Mark unsupported causal, incident or payment claims as critical failures.

The release gate requires all critical deterministic checks, at least 90% grounded-answer success across held-out live answers, and zero unresolved confidently fabricated critical claims. Report denominators and per-case failures for each repetition, plus missing or unreviewed cases. A passing analytics-only run leaves the documentary and combined evidence gates pending. Actual run status is in [progress.md](../../docs/progress.md#actual-plan-11-verification).
