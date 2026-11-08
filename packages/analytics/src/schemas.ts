import { z } from "zod";

export const brand = z.enum(["harbor", "summit"]);
export const provider = z.enum(["nova", "orbit", "pulse"]);
export const status = z.enum(["settled", "pending", "void"]);
const timestamp = z.iso.datetime({ precision: 3 });
const fields = {
  from: timestamp,
  to: timestamp,
  brand: brand.optional(),
  provider: provider.optional(),
};
const validRange = (q: { from: string; to: string }) =>
  q.from < q.to && Date.parse(q.to) - Date.parse(q.from) <= 90 * 86400000;
const rangeMessage = "Require from < to and at most 90 days";
export const metricQuery = z
  .strictObject(fields)
  .refine(validRange, rangeMessage)
  .refine(
    (q) => [q.from, q.to].every((t) => t.endsWith("T00:00:00.000Z")),
    "Metrics require complete UTC days",
  );
const pageNumber = (max: number, fallback: number) =>
  z
    .string()
    .regex(/^(0|[1-9]\d*)$/)
    .transform(Number)
    .pipe(z.number().int().max(max))
    .default(fallback);
export const activityQuery = z
  .strictObject({
    ...fields,
    basis: z.enum(["settlement", "placement"]).default("settlement"),
    status: status.optional(),
    sort: z.enum(["date", "stake"]).default("date"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    limit: pageNumber(100, 50).refine((n) => n >= 1),
    offset: pageNumber(100000, 0),
    datasetHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .refine(validRange, rangeMessage)
  .refine(
    (q) => q.basis !== "settlement" || !q.status || q.status === "settled",
    "Settlement basis requires settled status",
  )
  .refine(
    (q) => q.offset === 0 || !!q.datasetHash,
    "Subsequent pages require datasetHash",
  );
export type MetricInput = z.infer<typeof metricQuery>;
export type ActivityInput = z.infer<typeof activityQuery>;
export type Kind = "summary" | "trend" | "contributions" | "activity";
const integer = z.number().int().safe();
export const totalsSchema = z.object({
  stakes: integer,
  payouts: integer,
  ggr: integer,
  players: integer,
});
export const datasetSchema = z.object({
  schemaVersion: integer,
  generatorVersion: integer,
  seed: integer,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  rowCount: integer,
  from: timestamp,
  to: timestamp,
  asOf: timestamp,
});
export const metadataSchema = z.object({
  synthetic: z.literal(true),
  currency: z.literal("EUR"),
  reportingTimezone: z.literal("UTC"),
  dataset: datasetSchema,
  scope: z.object({
    ...fields,
    basis: z.enum(["settlement", "placement"]),
    status: status.nullable(),
  }),
});
const comparisonSchema = z.object({
  from: timestamp,
  to: timestamp,
  unavailableReason: z.enum(["outside_dataset_window"]).nullable(),
});
const periodTotalsSchema = totalsSchema.extend({
  holdPercent: z
    .number()
    .nullable()
    .describe(
      "Period GGR divided by settled stakes × 100, or null when stakes are zero.",
    ),
});
export const summarySchema = z.object({
  metadata: metadataSchema,
  current: periodTotalsSchema,
  previous: periodTotalsSchema.nullable(),
  comparison: comparisonSchema,
  ggrChange: integer.nullable(),
  ggrChangePercent: z.number().nullable(),
  percentageUnavailableReason: z
    .enum(["outside_dataset_window", "nonpositive_baseline"])
    .nullable(),
});
export const trendSchema = z.object({
  metadata: metadataSchema,
  days: z
    .array(z.object({ from: timestamp, to: timestamp, ...totalsSchema.shape }))
    .max(90),
});
export const contributionsSchema = z.object({
  metadata: metadataSchema,
  comparison: comparisonSchema,
  providers: z
    .array(
      z.object({
        provider,
        currentGgr: integer,
        previousGgr: integer.nullable(),
        change: integer.nullable(),
      }),
    )
    .max(3),
});
export const transactionSchema = z.object({
  id: z.string(),
  player_id: z.string(),
  brand_id: brand,
  provider_id: provider,
  game_category: z.enum(["slots", "table"]),
  placed_at: timestamp,
  settled_at: timestamp.nullable(),
  status,
  currency: z.literal("EUR"),
  stake_minor: integer,
  payout_minor: integer.nullable(),
});
export const activitySchema = z.object({
  metadata: metadataSchema,
  rows: z.array(transactionSchema).max(100),
  page: z.object({
    limit: integer,
    offset: integer,
    nextOffset: integer.nullable(),
    sort: z.enum(["date", "stake"]),
    direction: z.enum(["asc", "desc"]),
    datasetHash: z.string(),
  }),
});
export const errorSchema = z.object({
  error: z.object({
    code: z.enum([
      "INVALID_QUERY",
      "DATASET_CHANGED",
      "UNAVAILABLE",
      "TIMEOUT",
      "CANCELLED",
    ]),
    message: z.string(),
  }),
});
export const responseSchemas = {
  summary: summarySchema,
  trend: trendSchema,
  contributions: contributionsSchema,
  activity: activitySchema,
};
