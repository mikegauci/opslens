import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  type CopilotEvent,
  copilotScope,
} from "../../packages/analytics/src/copilot";

const entrySchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  split: z.enum(["development", "held-out"]),
  track: z.enum(["analytics", "retrieval", "simulated"]),
  scope: z.string(),
  question: z.string().min(1).max(600),
  review: z.string().min(1),
  retrievalCase: z.string().optional(),
  expected: z.object({
    evidence: z.array(
      z.object({
        kind: z.enum(["summary", "comparison", "contributions", "activity"]),
        fields: z.record(z.string(), z.unknown()),
      }),
    ),
    documents: z.array(z.string()),
    outcome: z.enum([
      "references",
      "CLARIFY",
      "NO_SOURCES",
      "OUTSIDE_SCOPE",
      "failed",
      "unsupported",
      "timeout",
      "cancelled",
    ]),
  }),
});
export type EvalCase = z.infer<typeof entrySchema>;

export function loadCopilotCases() {
  const source = readFileSync(
    new URL("../../evals/copilot/cases.json", import.meta.url),
    "utf8",
  );
  const suite = z
    .object({
      version: z.number().int().positive(),
      reviewStatus: z.union([
        z.literal("pending-human-review"),
        z.object({ reviewer: z.string().min(1), date: z.iso.date() }),
      ]),
      scopes: z.record(z.string(), copilotScope),
      cases: z.array(entrySchema).min(30),
    })
    .parse(JSON.parse(source));
  if (
    new Set(suite.cases.map(({ id }) => id)).size !== suite.cases.length ||
    suite.cases.some(({ scope }) => !Object.hasOwn(suite.scopes, scope)) ||
    suite.cases.filter(({ split }) => split === "held-out").length < 8
  )
    throw new Error("Invalid copilot case IDs, scopes or held-out split");
  return {
    ...suite,
    sha256: createHash("sha256").update(source).digest("hex"),
  };
}

function includesFields(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((value) =>
        actual.some((candidate) => includesFields(candidate, value)),
      )
    );
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object") return false;
    const fields = actual as Record<string, unknown>;
    return Object.entries(expected).every(([key, value]) =>
      includesFields(fields[key], value),
    );
  }
  return actual === expected;
}

export function scoreAnswer(entry: EvalCase, events: CopilotEvent[]) {
  const failures: string[] = [];
  const byId = new Map(
    events.flatMap((event) =>
      event.type === "evidence" ? [[event.evidence.id, event.evidence]] : [],
    ),
  );
  if (events.filter((event) => event.type === "evidence").length !== byId.size)
    failures.push("duplicate evidence ID");
  const terminals = events.filter(
    (event) => event.type === "complete" || event.type === "error",
  );
  const terminal = events.at(-1);
  if (terminals.length !== 1 || terminals[0] !== terminal)
    failures.push("missing or misplaced terminal event");
  const answer = terminal?.type === "complete" ? terminal.answer : undefined;
  const outcome =
    typeof answer === "object"
      ? "references"
      : (answer ?? (terminal?.type === "error" ? terminal.code : undefined));
  if (outcome !== entry.expected.outcome)
    failures.push(
      `expected ${entry.expected.outcome}, got ${outcome ?? "none"}`,
    );
  const selected =
    typeof answer === "object"
      ? answer.references.flatMap((id) => {
          const item = byId.get(id);
          if (!item) failures.push(`unknown evidence ID ${id}`);
          return item ? [item] : [];
        })
      : [];
  for (const { kind, fields } of entry.expected.evidence) {
    if (
      !selected.some(
        (item) => item.kind === kind && includesFields(item.result, fields),
      )
    )
      failures.push(`missing or incorrect ${kind} evidence`);
  }
  const documents = selected.flatMap((item) =>
    item.kind === "document"
      ? [`${item.result.documentId}@${item.result.version}`]
      : [],
  );
  if (documents.some((key) => !entry.expected.documents.includes(key)))
    failures.push("unaccepted document citation");
  if (
    entry.track === "simulated" &&
    outcome === "references" &&
    entry.expected.documents.length &&
    documents.length === 0
  )
    failures.push("missing document citation");
  return { pass: failures.length === 0, failures, outcome, documents };
}
