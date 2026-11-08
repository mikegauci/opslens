# OpsLens evidence library

The [documents](documents/) are original guidance for the synthetic OpsLens dataset. The [metric contract](../docs/metric-contract.md) governs reporting. Documents cover metric definitions, data rules and investigation runbooks. Each file declares its stable ID, version, effective date, scope, publication status and repository path. Cite a specific version, such as `RUN-COMPARE@2`. The archive contains an illustrative superseded draft so evaluation can exercise conflicting evidence.

## Index a release

1. Run `pnpm knowledge:check` to validate the documents, print the corpus fingerprint and check the retrieval labels against the available versions.
2. In an OpenAI API project, provision a dedicated empty vector store for this corpus release. Configure `OPENAI_API_KEY` and `OPENAI_VECTOR_STORE_ID` via the server environment or the ignored root `.env`. The key needs permission to list and upload Files, list and attach vector-store files, and read their indexing status. Use one operator per store.
3. Run `pnpm knowledge:ingest`. It uploads the original Markdown, associates per-version metadata with the vector-store files and waits for indexing. Only a complete run writes the local mapping to `evals/runs/private/knowledge-manifest.json`. It records the store ID, corpus fingerprint and every source's path, identity, SHA-256 and hosted file ID. A successful rerun reuses those hosted attachments and can reconstruct the manifest from the same checkout.

A partial run is safe to retry after the hosted file lists reflect the previous operations. Ingestion checks all existing attachments before adding files. It resumes an interrupted upload by its release-store-specific hashed filename and refuses ambiguous uploads, foreign attachments and duplicate or changed versions. A local lock prevents overlapping runs in one checkout. After an interrupted process, clear the manifest's `.lock` only after confirming the process exited. Across checkouts, serialize ingestion manually.

Publish changes under new document versions and index a new release in a separate empty store. After switching to the new manifest, use the OpenAI project controls or API to detach duplicate or failed attachments and retire unused stores. Confirm dependencies before deleting underlying Files, because global deletion affects every attached store. For a failed upload with invalid contents, remove the failed attachment and the corresponding project file before retrying. Do not detach the sole valid attachment in an active release. [OpenAI retrieval guide](https://developers.openai.com/api/docs/guides/retrieval).

## Verify retrieval

Configure `OPENAI_FILE_SEARCH_MODEL` with a Responses model your OpenAI API project can use with File Search. Run `pnpm knowledge:eval ggr-negative` for a live retrieval and citation smoke test. Run `pnpm knowledge:eval` for all eight cases. The dashboard has no dependency on either command or OpenAI credentials.

The runner uses the installed AI SDK OpenAI provider's Responses integration. It asks for File Search result chunks and independently reads file citations from answer metadata. The adapter verifies retrieved file IDs, corpus attributes, scope and publication status against the local manifest. It resolves citations only when they refer to a returned result and exposes the local version and source path. Current-only searches filter out the superseded version. The historical comparison explicitly includes it. [OpenAI File Search](https://developers.openai.com/api/docs/guides/tools-file-search), [AI SDK OpenAI provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai).

The ignored live report records the configured and returned model, corpus hash, prompt and case versions, per-case latency, usage, ranked excerpts, answer and citation coordinates. It records per-case failures and exits nonzero if required evidence or citations are missing or a request fails. See the [review rubric](../evals/retrieval/README.md) for scoring and the distinction between retrieved context and supported claims.
