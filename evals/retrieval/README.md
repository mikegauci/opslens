# Retrieval evaluation

The [initial eight cases](cases.json) have proposed relevance labels and answer criteria. Each case supplies the allowed scope, whether superseded versions may surface, sources relevant to the query and sources essential for a supported answer. Missing-evidence cases distinguish useful context about the evidence gap from support for the unsupported premise.

Before relying on a relevance score, a human reviewer should read the original documents and check each case's relevant and required versions, scope, and answer criteria. Apply any corrections, record reviewer and ISO date in `reviewStatus`, and increment the suite version when changing the labels. A pending review remains explicit in every report.

- Search returns up to five chunks. Precision is the number of distinct relevant document versions divided by the number of distinct versions returned. Recall uses the number of labelled relevant versions as denominator. Citation precision uses distinct versions actually cited. Zero denominators produce null. A high score can still miss an essential source, so the report also lists missing required results and citations.
- Read each returned excerpt in rank order. Check whether it supports the claim, explains a limit or is irrelevant. Read the answer and cited excerpts together, then mark each case pass or fail with the supporting passage or failed criterion. Document identity alone cannot establish that an excerpt supports the claim.
- For the conflict case, require both versions as evidence and check that the answer applies v2 while identifying v1 as superseded. For the ordinary current comparison, any appearance of v1 is an adapter failure.
- For missing evidence, check whether the answer explicitly abstains on the unsupported claim. The retriever may still return loosely related passages, including useful evidence about what the dataset excludes. An empty result list or absence of citations is insufficient to establish appropriate abstention.

Save a reviewed run summary only after the live requests and review occurred. Include the corpus hash, model, suite version, number of cases attempted, errors, per-case source scores and any incorrect or unsupported claims. Keep the raw run in the ignored reports directory. These are retrieval-only prompts with no live analytics tool or dataset query.
