# Operations copilot plan

## Purpose

Help an analyst understand a metric, investigate an observed change, and open the relevant transactions. The copilot is contextual to the current dashboard filters and supports the same investigation journey as the non-AI interface.

Example questions:

1. What changed in GGR compared with the previous complete week?
2. Which providers contributed most to the change? Show the underlying transactions.
3. How do void transactions affect this metric, and what should I check next?

The answer combines retrieved definitions and runbooks with computed evidence. It should not infer an unobserved cause from a correlation.

## Two evidence paths

### Documentation retrieval: RAG

Create an original, versioned corpus in `knowledge/`: metric definitions, date/time rules, data freshness, transaction states, dataset limitations, and approximately six investigation guides. Aim for 12-20 short, useful documents rather than a large synthetic document dump.

Every document includes a stable ID, title, version, effective date, scope, and local source link. Upload these documents to OpenAI hosted File Search with a repeatable ingestion manifest mapping document versions and hashes to hosted file IDs. Use supported version/scope metadata filters, and verify ingestion completes before enabling the corpus. Re-running ingestion must avoid duplicate active versions and provide a deliberate cleanup path.

File Search provides hosted semantic and keyword retrieval through the Responses API. This is a managed RAG implementation. Explain that choice in the case study; do not claim to have built the underlying vector-search infrastructure.

Use the AI SDK OpenAI provider after checking its installed version's Responses/File Search integration. Confirm retrieval results and citation metadata are exposed to the client through a safe, typed response adapter. Verify whether the selected provider path supports all required features before adding routing layers.

PLAN-09 adds the [corpus and hosted commands](../knowledge/README.md) and the [retrieval review cases](../evals/retrieval/README.md). The runner exercises the installed Responses provider and resolves citations to local source versions. See [actual verification](progress.md#actual-plan-09-verification) for the live and review status.

### Numerical analytics: read-only tools

Expose a small allow-listed tool set:

- `getMetricSummary`: exact metrics for validated filters.
- `compareMetricPeriods`: comparable periods and their exact differences.
- `getProviderContributions`: per-provider contributions to the observed change.
- `getActivityLink`: a validated internal deep link to the matching explorer scope.

These tools use the same server calculation service as the dashboard. Validate tool arguments and returned shapes; bind the dataset and supported scope on the server. Do not accept arbitrary SQL, arbitrary URLs, or executable expressions from the model.

Return compact aggregates with evidence IDs, effective filters, period bounds, reporting timezone, currency, dataset version, and query time. Raw transaction dumps do not belong in the prompt. For numerical claims, display the verified evidence card even if the model's prose is incomplete or fails validation.

## User experience

Show the active filter scope when opening the panel and let the user explicitly apply a changed scope. Do not silently broaden a question beyond its intended period or brand.

Answers show a concise explanation, supporting figures, document citations with relevant excerpts, and optional explorer links. Use plain language such as 'Sources' and 'View matching transactions'. Do not expose private model reasoning or internal implementation logs.

Support submitting, searching, answering, cancelled, failed, and quota-exhausted states. Provide a stop control, preserve the question and filters on recoverable failure, and prevent partial evidence from being presented as a completed answer.

The rest of the application works without the model. A recorded guided example may be available when live AI is unavailable, but it must be visibly labelled as recorded and tied to its fixed dataset scope.

## Correctness and operational boundaries

- Keep API credentials on the server and out of repository history, browser bundles, and logs.
- Retrieved documents are untrusted data. Instructions found inside them must not replace the application's instructions or authorise new actions.
- If evidence is missing, stale, contradictory, or outside the dataset, state the limit and ask for a useful clarification or suggest the appropriate manual check.
- Require a source for substantive documentation claims. Validate citation IDs and tool-evidence references against actual retrieved/called results.
- Use strict input schemas, bounded date windows, result sizes, model output, tool iterations, and request duration.
- Implement persistent request quotas and a global live-demo limit; a per-process counter is insufficient across deployments.
- Cancel upstream work when supported and handle the fact that already-completed API work may still be billed.
- No database mutations, account decisions, user uploads, arbitrary SQL, or external actions are part of this feature.

## PLAN-10 implementation

Open **Ask Copilot** on Overview or Activity. The drawer pins the dates, brand, provider, basis and status. Close it to change the dashboard filters, then reopen it and choose **Use current dashboard filters** to confirm the change. The question is preserved. Placement scopes can open matching transactions. Settled metrics require complete UTC settlement days.

`POST /api/copilot` streams validated server-sent events through the generated API client. Read-only tool cards carry exact amounts, comparison bounds, effective filters, dataset hash, as-of timestamp and query time. The model selects evidence IDs or a supported clarification. The panel renders explanations from verified figures and cited excerpts, and keeps completed checks visible as incomplete evidence after an interrupted answer. Activity links are constructed from validated metadata and pin the dataset. A provider drill-down can narrow an unfiltered link only when the provider appears in the contribution evidence. Raw transaction rows stay server-side.

The dashboard runs with the database configuration alone. For a private local analytics session, set `OPSLENS_COPILOT_LOCAL=1`, `OPSLENS_COPILOT_MODEL` to an available OpenAI Responses model, and `OPENAI_API_KEY` in the server environment. Use `http://127.0.0.1:3000` with the default port. Public live access awaits persistent quotas and evaluation in PLAN-11. Requests are limited to 600 question characters, 4 KiB of JSON, six model steps, 400 output tokens per step and 40 seconds of upstream work.

Live document evidence is disabled in the production entry point. The citation adapter and source links are exercised with simulated retrieval. Enable hosted sources only after the PLAN-09 retrieval and citation checks and human relevance review succeed for the selected corpus and provider.

## Evaluation plan

Create 30 or more human-reviewed cases. Each specifies its dataset scope, expected tool evidence, acceptable document IDs, expected numerical values when applicable, and desired clarification/uncertainty behaviour. Reserve a held-out subset before tuning prompts. Store expected source relevance for retrieval-only cases so retrieval quality can be assessed separately from prose quality.

Include metric definitions, provider contribution calculations, combined RAG/data questions, zero denominators, negative GGR, incomplete comparison periods, timezone boundaries, missing/stale/contradictory documents, prompt injection in documents, malformed tool requests, unsupported causality, cancelled streams, and model/retrieval timeouts.

Use deterministic checks for exact tool output, evidence IDs, arithmetic, schema validity, internal URLs, and access boundaries. Use a written human-review rubric for citation support, completeness, useful uncertainty, and unsupported confident claims. Optional model grading can assist review, but must not be the only judge of factual correctness.

Proposed release gate: all critical deterministic checks pass, at least 90% grounded-answer success on the held-out cases, and no unresolved confidently fabricated critical claims in the release evaluation. Report the denominators, repeated-run variability, and individual failures rather than presenting one percentage as a guarantee.

Record the actual model ID, dependency versions, prompt version, corpus hash, dataset hash, evaluation cases, run date, retrieval quality, first-response and total latency, tool-call counts, token usage, and observed cost. Choose the model from current supported options through this evaluation; do not hardcode a model from memory at the planning stage.

Ordinary pull-request CI uses mocked provider results. Live evaluation is an explicit, bounded run producing a sanitised report. Do not claim live tests passed until they have run with configured credentials.

## References

- [OpenAI File Search](https://developers.openai.com/api/docs/guides/tools-file-search).
- [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling).
- [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
- [AI SDK OpenAI provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai).
