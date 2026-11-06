import { createHash } from "node:crypto";

export const columns = [
  "id",
  "player_id",
  "brand_id",
  "provider_id",
  "game_category",
  "placed_at",
  "settled_at",
  "status",
  "currency",
  "stake_minor",
  "payout_minor",
] as const;
export type Transaction = {
  id: string;
  player_id: string;
  brand_id: "harbor" | "summit";
  provider_id: "nova" | "orbit" | "pulse";
  game_category: "slots" | "table";
  placed_at: string;
  settled_at: string | null;
  status: "settled" | "void" | "pending";
  currency: "EUR";
  stake_minor: number;
  payout_minor: number | null;
};
export const definition = {
  schemaVersion: 1,
  generatorVersion: 1,
  seed: 20261106,
  currency: "EUR",
  reportingTimezone: "UTC",
  from: "2026-07-01T00:00:00.000Z",
  to: "2026-09-29T00:00:00.000Z",
  asOf: "2026-09-30T00:00:00.000Z",
  emptyDay: "2026-08-15",
  previous: {
    from: "2026-09-15T00:00:00.000Z",
    to: "2026-09-22T00:00:00.000Z",
  },
  current: { from: "2026-09-22T00:00:00.000Z", to: "2026-09-29T00:00:00.000Z" },
  spike: { provider: "nova", payoutMultiplier: 10 },
} as const;

// Fixed uint32 LCG; no clock, locale, platform RNG or floating point money.
export function generate(count: number): Transaction[] {
  if (count !== 10_000 && count !== 100_000)
    throw new Error("Use 10000 or 100000 rows");
  let state: number = definition.seed;
  const random = (max: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 4294967296) * max);
  };
  const start = Date.parse(definition.from);
  return Array.from({ length: count }, (_, i): Transaction => {
    let day = random(90);
    if (day === 45) day = 46; // Deliberate empty UTC day, including placement dates.
    const settled = new Date(
      start + day * 86400000 + random(86400) * 1000,
    ).toISOString();
    const provider = (["nova", "orbit", "pulse"] as const)[random(3)];
    const roll = random(100);
    const status = roll < 8 ? "pending" : roll < 13 ? "void" : "settled";
    const stake = random(101) * 100;
    let payout = roll % 3 === 0 ? stake * 2 : 0;
    if (provider === "nova" && settled >= definition.current.from)
      payout = stake * definition.spike.payoutMultiplier;
    return {
      id: `bet-${String(i + 1).padStart(6, "0")}`,
      player_id: `player-${random(2000) + 1}`,
      brand_id: random(2) ? "harbor" : "summit",
      provider_id: provider,
      game_category: random(2) ? "slots" : "table",
      placed_at: settled,
      settled_at: status === "settled" ? settled : null,
      status,
      currency: "EUR",
      stake_minor: stake,
      payout_minor: status === "settled" ? payout : null,
    };
  }).map((row, i): Transaction => {
    // Explicit half-open boundary probes. Placed before settlement for cross-basis checks.
    const boundary = [
      definition.from,
      definition.previous.from,
      definition.current.from,
      definition.to,
    ][i];
    if (!boundary) return row;
    return {
      ...row,
      placed_at: new Date(Date.parse(boundary) - 1000).toISOString(),
      settled_at: boundary,
      status: "settled",
      stake_minor: 100,
      payout_minor: 0,
    };
  });
}

export function csv(rows: Transaction[]): string {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((key) => row[key] ?? "").join(",")).join("\n")}\n`;
}
export function artifact(count: number) {
  const content = csv(generate(count));
  return {
    content,
    manifest: {
      ...definition,
      rowCount: count,
      file: `transactions-${count}.csv`,
      sha256: createHash("sha256").update(content).digest("hex"),
      encoding: "UTF-8; LF; header; empty field = null",
    },
  };
}
