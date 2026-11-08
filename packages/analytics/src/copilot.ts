import { z } from "zod";
import {
  activityQuery,
  brand,
  contributionsSchema,
  metadataSchema,
  provider,
  status,
  summarySchema,
} from "./schemas";

export const copilotScope = z
  .strictObject({
    from: z.iso.datetime({ precision: 3 }),
    to: z.iso.datetime({ precision: 3 }),
    brand: brand.optional(),
    provider: provider.optional(),
    basis: z.enum(["settlement", "placement"]),
    status: status.optional(),
    datasetHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .refine(
    (scope) => activityQuery.safeParse(scope).success,
    "Invalid activity scope",
  );
export type CopilotScope = z.infer<typeof copilotScope>;

export const copilotRequest = z.strictObject({
  scope: copilotScope,
  question: z.string().trim().min(1).max(600),
});

const evidenceId = z.string().regex(/^E[1-9][0-9]?$/);
const common = { id: evidenceId, queriedAt: z.iso.datetime({ precision: 3 }) };
export const documentSource = z.strictObject({
  documentId: z.string().regex(/^[A-Z][A-Z0-9-]{1,49}$/),
  version: z.number().int().positive(),
  title: z.string().min(1).max(150),
  source: z.string().regex(/^knowledge\/documents\/[a-z0-9-]+\.md$/),
  excerpt: z.string().min(1).max(2000),
});

export const copilotEvidence = z.discriminatedUnion("kind", [
  z.object({
    ...common,
    kind: z.literal("summary"),
    result: summarySchema.pick({ metadata: true, current: true }),
  }),
  z.object({ ...common, kind: z.literal("comparison"), result: summarySchema }),
  z.object({
    ...common,
    kind: z.literal("contributions"),
    result: contributionsSchema,
  }),
  z.object({
    ...common,
    kind: z.literal("activity"),
    result: z.object({ metadata: metadataSchema }),
  }),
  z.object({ ...common, kind: z.literal("document"), result: documentSource }),
]);
export type CopilotEvidence = z.infer<typeof copilotEvidence>;

export const copilotEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("searching") }),
  z.object({ type: z.literal("answering") }),
  z.object({ type: z.literal("evidence"), evidence: copilotEvidence }),
  z.object({
    type: z.literal("complete"),
    answer: z.union([
      z.object({ references: z.array(evidenceId).min(1).max(12) }),
      z.enum(["CLARIFY", "NO_SOURCES", "OUTSIDE_SCOPE"]),
    ]),
  }),
  z.object({
    type: z.literal("error"),
    code: z.enum([
      "failed",
      "timeout",
      "quota",
      "scope",
      "dataset",
      "unsupported",
    ]),
  }),
]);
export type CopilotEvent = z.infer<typeof copilotEvent>;
export type CopilotAnswer = Extract<
  CopilotEvent,
  { type: "complete" }
>["answer"];
export type CopilotError = Extract<CopilotEvent, { type: "error" }>["code"];

export function matchesCopilotScope(
  expected: CopilotScope,
  metadata: z.infer<typeof metadataSchema>,
) {
  const actual = metadata.scope;
  return (
    actual.from === expected.from &&
    actual.to === expected.to &&
    actual.brand === expected.brand &&
    actual.provider === expected.provider &&
    actual.basis === expected.basis &&
    actual.status ===
      (expected.basis === "settlement"
        ? "settled"
        : (expected.status ?? null)) &&
    (!expected.datasetHash || expected.datasetHash === metadata.dataset.sha256)
  );
}
