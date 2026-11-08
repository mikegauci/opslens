import { mkdir, writeFile } from "node:fs/promises";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelUsage } from "ai";
import pg from "pg";
import { z } from "zod";
import {
  copilotLimits,
  copilotPromptVersion,
} from "../../apps/api/src/copilot";
import workspace from "../../package.json";
import { createAnalyticsService } from "../../packages/analytics/src/service";
import { loadCorpus, privateDirectory } from "../knowledge/corpus";
import { loadCopilotCases, scoreAnswer } from "./cases";
import { evaluateRequest } from "./request";

function summarizeUsage(steps: { usage: LanguageModelUsage }[]) {
  const sums = steps.reduce(
    (total, { usage }) => ({
      inputTokens: total.inputTokens + (usage.inputTokens ?? 0),
      cachedInputTokens:
        total.cachedInputTokens +
        (usage.inputTokenDetails.cacheReadTokens ?? 0),
      outputTokens: total.outputTokens + (usage.outputTokens ?? 0),
    }),
    { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 },
  );
  const complete =
    steps.length > 0 &&
    steps.every(
      ({ usage }) =>
        usage.inputTokens !== undefined && usage.outputTokens !== undefined,
    );
  return { ...sums, complete };
}

async function run() {
  const [flag, selection = "held-out", extra] = process.argv.slice(2);
  if (flag !== "--live" || extra)
    throw new Error(
      "Usage: pnpm copilot:eval --live [held-out|development|all|analytics-case-id]",
    );
  const suite = loadCopilotCases();
  const cases = suite.cases.filter(
    ({ track, split, id }) =>
      track === "analytics" &&
      (selection === "all" || selection === split || selection === id),
  );
  if (!cases.length || cases.length > 20)
    throw new Error("Select between 1 and 20 analytics cases.");
  const modelId = process.env.OPSLENS_COPILOT_MODEL?.trim();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const database = process.env.DATABASE_URL?.trim();
  if (!apiKey || !modelId || !database)
    throw new Error(
      "Live analytics evaluation unavailable. Set OPENAI_API_KEY, OPSLENS_COPILOT_MODEL and DATABASE_URL.",
    );
  const rate = process.env.OPSLENS_EVAL_USD_PER_MILLION;
  const rates = rate
    ? z
        .tuple([
          z.number().nonnegative(),
          z.number().nonnegative(),
          z.number().nonnegative(),
        ])
        .parse(JSON.parse(rate))
    : null;
  const corpus = await loadCorpus();
  const pool = new pg.Pool({
    connectionString: database,
    connectionTimeoutMillis: 3000,
    max: 2,
  });
  const model = createOpenAI({ apiKey }).responses(modelId);
  const analytics = createAnalyticsService(pool);
  const started = new Date().toISOString();
  const repetitions = 2;
  const runs = [];
  let haltedForProviderStatus: number | undefined;
  try {
    const { rows } = await pool.query<{ hash: string }>(
      "SELECT manifest->>'sha256' AS hash FROM opslens_private.dataset",
    );
    const datasetHash = rows[0]?.hash;
    if (
      !datasetHash ||
      cases.some(
        (entry) => suite.scopes[entry.scope].datasetHash !== datasetHash,
      )
    )
      throw new Error(
        "Live analytics evaluation requires the frozen 100,000-row dataset.",
      );
    for (const entry of cases) {
      for (let repeat = 1; repeat <= repetitions; repeat++) {
        const steps: { modelId: string; usage: LanguageModelUsage }[] = [];
        const tools: string[] = [];
        let providerStatus: number | undefined;
        const measured = await evaluateRequest(
          analytics,
          {
            model,
            evaluation: {
              step: (id, usage) => steps.push({ modelId: id, usage }),
              tool: (name) => tools.push(name),
              error: (_code, status) => {
                providerStatus = status;
              },
            },
          },
          entry.question,
          suite.scopes[entry.scope],
        );
        const usage = summarizeUsage(steps);
        const score = scoreAnswer(entry, measured.events);
        const estimatedUsd =
          rates &&
          usage.complete &&
          score.outcome &&
          measured.events.at(-1)?.type === "complete"
            ? ((usage.inputTokens - usage.cachedInputTokens) * rates[0] +
                usage.cachedInputTokens * rates[1] +
                usage.outputTokens * rates[2]) /
              1e6
            : null;
        runs.push({
          id: entry.id,
          split: entry.split,
          repeat,
          ...measured,
          ...score,
          actualModels: [...new Set(steps.map((step) => step.modelId))],
          toolCalls: tools,
          usage,
          estimatedUsd,
          providerStatus,
          humanReview: "pending",
        });
        if (
          providerStatus === 401 ||
          providerStatus === 403 ||
          providerStatus === 429
        ) {
          haltedForProviderStatus = providerStatus;
          break;
        }
      }
      if (haltedForProviderStatus) break;
    }
    const planned = cases.length * repetitions;
    const report = {
      mode: "live-analytics",
      started,
      selection,
      model: modelId,
      node: process.version,
      sdk: workspace.devDependencies.ai,
      provider: workspace.devDependencies["@ai-sdk/openai"],
      promptVersion: copilotPromptVersion,
      corpusHash: corpus.digest,
      documentsEnabled: false,
      datasetHash,
      suiteVersion: suite.version,
      suiteSha256: suite.sha256,
      caseReview: suite.reviewStatus,
      limits: copilotLimits,
      repetitions,
      planned,
      completed: runs.length,
      deterministicPasses: runs.filter(({ pass }) => pass).length,
      heldOutAttempts: runs.filter(({ split }) => split === "held-out").length,
      heldOutDeterministicPasses: runs.filter(
        ({ split, pass }) => split === "held-out" && pass,
      ).length,
      haltedForProviderStatus,
      pricingUsdPerMillion: rates,
      invoicedUsd: null,
      runs,
    };
    await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
    const path = `${privateDirectory}copilot-${started.replaceAll(":", "-")}.json`;
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    console.log(
      `Live analytics: ${report.deterministicPasses}/${planned} passed deterministic checks (${runs.length} attempted). Report: ${path}`,
    );
    if (report.deterministicPasses !== planned) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

try {
  await run();
} catch (error) {
  // Provider and database exceptions may contain private request details.
  const message =
    error instanceof Error &&
    /^(Usage:|Select between|Live analytics evaluation (unavailable|requires))/.test(
      error.message,
    )
      ? error.message
      : "Live analytics evaluation could not finish. Check the database, case files and pricing configuration.";
  console.error(message);
  process.exitCode = 1;
}
