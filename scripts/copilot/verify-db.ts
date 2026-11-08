import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import pg from "pg";
import { createCopilotQuota } from "../../apps/api/src/copilot-quota";
import { createAnalyticsService } from "../../packages/analytics/src/service";
import { admin } from "../db/shared";
import { loadCorpus, versionKey } from "../knowledge/corpus";
import { loadCases } from "../knowledge/evaluate";
import { loadCopilotCases, scoreAnswer } from "./cases";
import { evaluateRequest } from "./request";

if (process.env.OPSLENS_QUOTA_TEST !== "1" || !process.env.DATABASE_URL)
  throw new Error(
    "Use OPSLENS_QUOTA_TEST=1 and DATABASE_URL on a disposable test database.",
  );

const owner = admin();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 6,
  connectionTimeoutMillis: 3000,
});
const otherPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 6,
  connectionTimeoutMillis: 3000,
});

let disposable = false;
try {
  await owner.connect();
  const {
    rows: [before],
  } = await owner.query<{ empty: boolean }>(
    "SELECT NOT EXISTS (SELECT FROM opslens_private.copilot_quota) AS empty",
  );
  assert(
    before.empty,
    "Quota verification requires a fresh quota table on a disposable database",
  );
  disposable = true;
  await assert.rejects(
    pool.query("SELECT * FROM opslens_private.copilot_quota"),
    { code: "42501" },
  );
  for (const role of ["anon", "authenticated", "service_role"]) {
    const { rows } = await owner.query<{
      can_call: boolean;
      can_read: boolean;
      can_write: boolean;
    }>(
      `SELECT
        has_function_privilege(oid, 'opslens_private.reserve_copilot_request(text)', 'EXECUTE') AS can_call,
        has_table_privilege(oid, 'opslens_private.copilot_quota', 'SELECT') AS can_read,
        has_table_privilege(oid, 'opslens_private.copilot_quota', 'INSERT') AS can_write
        FROM pg_roles WHERE rolname = $1`,
      [role],
    );
    for (const grants of rows)
      assert.deepEqual(grants, {
        can_call: false,
        can_read: false,
        can_write: false,
      });
  }
  await owner.query(
    "INSERT INTO opslens_private.copilot_quota VALUES ((now() AT TIME ZONE 'UTC')::date - 2, '', 1)",
  );
  const secret = "local disposable quota verification";
  const reserve = [
    createCopilotQuota(pool, secret),
    createCopilotQuota(otherPool, secret),
  ];
  const sameVisitor = await Promise.all(
    Array.from({ length: 12 }, (_, i) => reserve[i % 2]("192.0.2.1")),
  );
  assert.equal(sameVisitor.filter(Boolean).length, 5);
  const differentVisitors = await Promise.all(
    Array.from({ length: 60 }, (_, i) => reserve[i % 2](`198.51.100.${i + 1}`)),
  );
  assert.equal(differentVisitors.filter(Boolean).length, 45);
  const { rows: buckets } = await owner.query<{ requests: number }>(
    "SELECT requests FROM opslens_private.copilot_quota WHERE visitor = ''",
  );
  assert.deepEqual(buckets, [{ requests: 50 }], "global limit and pruning");
  const reopened = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3000,
  });
  try {
    assert.equal(
      await createCopilotQuota(reopened, secret)("203.0.113.1"),
      false,
    );
  } finally {
    await reopened.end();
  }
  console.log(
    "Quota checks passed: 5 per visitor, 50 global, concurrent pools, new pool, pruning and role grants.",
  );

  const suite = loadCopilotCases();
  const analytics = createAnalyticsService(pool);
  const corpus = await loadCorpus();
  const retrievalSuite = await loadCases(corpus);
  for (const entry of suite.cases.filter(
    ({ track }) => track === "retrieval",
  )) {
    const labels = retrievalSuite.cases.find(
      ({ id }) => id === entry.retrievalCase,
    );
    assert(labels, `Missing retrieval labels for ${entry.id}`);
    assert.equal(entry.question, labels.query);
    assert.deepEqual(entry.expected.documents, labels.relevant);
  }
  const selected = suite.cases.filter(
    ({ track, id }) => track === "analytics" || id === "mixed-voids",
  );
  const source = corpus.documents.find(
    ({ metadata }) => versionKey(metadata) === "DATA-STATE@1",
  );
  assert(source);
  const simulatedSource = {
    ...source.metadata,
    excerpt: source.bytes.toString("utf8").split("\n\n")[2],
    score: 1,
  };
  const toolFor = {
    summary: "getMetricSummary",
    comparison: "compareMetricPeriods",
    contributions: "getProviderContributions",
    activity: "getActivityLink",
  };
  for (const entry of selected) {
    const mixed = entry.track === "simulated";
    const planned = entry.expected.evidence.map(({ kind, fields }) => ({
      name: toolFor[kind],
      input:
        kind === "activity"
          ? {
              provider:
                (fields.metadata as { scope: { provider?: string } }).scope
                  .provider ?? null,
            }
          : {},
    }));
    if (mixed) planned.push({ name: "getDocumentSources", input: {} });
    const selection = planned.length
      ? planned.map((_, i) => `E${i + 1}`).join(" ")
      : entry.expected.outcome;
    let index = 0;
    const model = new MockLanguageModelV4({
      doStream: async () => {
        const item = planned[index++];
        return {
          stream: new ReadableStream({
            start(output) {
              if (item) {
                output.enqueue({
                  type: "tool-call",
                  toolCallId: `test-${index}`,
                  toolName: item.name,
                  input: JSON.stringify(item.input),
                });
              } else {
                output.enqueue({ type: "text-start", id: "text" });
                output.enqueue({
                  type: "text-delta",
                  id: "text",
                  delta: selection,
                });
                output.enqueue({ type: "text-end", id: "text" });
              }
              output.enqueue({
                type: "finish",
                finishReason: {
                  unified: item ? "tool-calls" : "stop",
                  raw: undefined,
                },
                usage: {
                  inputTokens: {
                    total: 0,
                    noCache: 0,
                    cacheRead: 0,
                    cacheWrite: 0,
                  },
                  outputTokens: { total: 0, text: 0, reasoning: 0 },
                },
              });
              output.close();
            },
          }),
        };
      },
    });
    const result = await evaluateRequest(
      analytics,
      {
        model,
        ...(mixed
          ? {
              sources: async () => ({
                results: [simulatedSource],
                citations: [{ ...simulatedSource, partIndex: 0, index: 0 }],
              }),
            }
          : {}),
      },
      entry.question,
      suite.scopes[entry.scope],
    );
    const score = scoreAnswer(entry, result.events);
    assert(score.pass, `${entry.id}: ${score.failures.join(", ")}`);
  }
  console.log(
    `${selected.length}/${selected.length} analytical and mixed cases matched frozen expectations using real SQL, scripted model choices and simulated retrieval.`,
  );
} finally {
  try {
    if (disposable) await owner.query("TRUNCATE opslens_private.copilot_quota");
  } finally {
    await Promise.all([owner.end(), pool.end(), otherPool.end()]);
  }
}
