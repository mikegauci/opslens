import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  type Corpus,
  privateDirectory,
  readManifest,
  scopeSchema,
  versionKey,
} from "./corpus.js";
import { maxResults, promptVersion, retrieve } from "./retrieve.js";

const caseSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  scope: scopeSchema.nullable(),
  historical: z.boolean(),
  query: z.string().min(1).max(1000),
  relevant: z.array(z.string()),
  required: z.array(z.string()),
  review: z.string().min(1),
});

export async function loadCases(corpus: Corpus) {
  const suite = z
    .object({
      version: z.number().int().positive(),
      reviewStatus: z.union([
        z.literal("pending-human-review"),
        z.object({ reviewer: z.string().min(1), date: z.iso.date() }),
      ]),
      cases: z.array(caseSchema).min(1).max(20),
    })
    .parse(
      JSON.parse(
        await readFile(
          new URL("../../evals/retrieval/cases.json", import.meta.url),
          "utf8",
        ),
      ),
    );
  const documents = new Map(
    corpus.documents.map(({ metadata }) => [versionKey(metadata), metadata]),
  );
  const ids = new Set<string>();
  for (const entry of suite.cases) {
    if (ids.has(entry.id))
      throw new Error(`Duplicate retrieval case ${entry.id}`);
    ids.add(entry.id);
    const relevant = new Set(entry.relevant);
    if (
      relevant.size !== entry.relevant.length ||
      new Set(entry.required).size !== entry.required.length ||
      entry.required.some((key) => !relevant.has(key))
    ) {
      throw new Error(`Invalid relevance labels for ${entry.id}`);
    }
    for (const key of relevant) {
      const document = documents.get(key);
      if (
        !document ||
        (entry.scope && entry.scope !== document.scope) ||
        (!entry.historical && document.status !== "current")
      ) {
        throw new Error(`Unsearchable document ${key} in ${entry.id}`);
      }
    }
  }
  return suite;
}

export function score(
  entry: Pick<z.infer<typeof caseSchema>, "relevant" | "required">,
  result: Pick<Awaited<ReturnType<typeof retrieve>>, "results" | "citations">,
) {
  const retrieved = [...new Set(result.results.map(versionKey))];
  const cited = [...new Set(result.citations.map(versionKey))];
  const relevantRetrieved = retrieved.filter((key) =>
    entry.relevant.includes(key),
  );
  const relevantCited = cited.filter((key) => entry.relevant.includes(key));
  return {
    retrieved,
    cited,
    precision: retrieved.length
      ? relevantRetrieved.length / retrieved.length
      : null,
    recall: entry.relevant.length
      ? relevantRetrieved.length / entry.relevant.length
      : null,
    citationPrecision: cited.length
      ? relevantCited.length / cited.length
      : null,
    missingRequiredResults: entry.required.filter(
      (key) => !retrieved.includes(key),
    ),
    missingRequiredCitations: entry.required.filter(
      (key) => !cited.includes(key),
    ),
  };
}

export async function evaluate(corpus: Corpus, caseId?: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_FILE_SEARCH_MODEL?.trim();
  if (!apiKey || !model) {
    throw new Error(
      "Live retrieval unavailable. Set server-side OPENAI_API_KEY and OPENAI_FILE_SEARCH_MODEL.",
    );
  }
  const manifest = await readManifest(corpus);
  const suite = await loadCases(corpus);
  const selected = suite.cases.filter(({ id }) => !caseId || id === caseId);
  if (selected.length === 0) throw new Error("Unknown retrieval case ID");

  const provider = createOpenAI({
    apiKey,
    baseURL: "https://api.openai.com/v1",
  });
  const started = new Date().toISOString();
  const cases = [];
  let failed = false;
  for (const entry of selected) {
    const start = performance.now();
    try {
      const result = await retrieve(
        provider,
        model,
        manifest,
        entry.query,
        entry,
      );
      const scores = score(entry, result);
      if (
        scores.missingRequiredResults.length ||
        scores.missingRequiredCitations.length
      )
        failed = true;
      cases.push({
        ...entry,
        durationMs: Math.round(performance.now() - start),
        ...result,
        ...scores,
      });
    } catch (error) {
      failed = true;
      // Provider errors can carry request bodies. Persist only the error category and HTTP status.
      const status = z
        .object({ statusCode: z.number().int() })
        .safeParse(error);
      cases.push({
        id: entry.id,
        durationMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.name : "UnknownError",
        status: status.data?.statusCode,
      });
    }
  }
  const report = {
    mode: "live",
    started,
    model,
    corpus: manifest.corpus,
    suiteVersion: suite.version,
    reviewStatus: suite.reviewStatus,
    promptVersion,
    maxResults,
    cases,
  };
  await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
  const path = `${privateDirectory}retrieval-${started.replaceAll(":", "-")}.json`;
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  console.log(`Live report for ${cases.length} case(s) saved at ${path}`);
  if (failed) process.exitCode = 1;
}
