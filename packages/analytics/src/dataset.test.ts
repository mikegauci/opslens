import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { artifact, definition, generate } from "../../../scripts/data/dataset";

const approved = JSON.parse(readFileSync("data/manifest.json", "utf8"));
describe("versioned synthetic datasets", () => {
  for (const count of [10_000, 100_000]) {
    it(`repeats ${count} records and the approved hash`, () => {
      const first = artifact(count);
      expect(artifact(count)).toEqual(first);
      expect(first.manifest).toEqual(
        approved.find((item: { rowCount: number }) => item.rowCount === count),
      );
      const rows = generate(count);
      expect(new Set(rows.map((row) => row.id)).size).toBe(count);
      expect(new Set(rows.map((row) => row.status))).toEqual(
        new Set(["settled", "pending", "void"]),
      );
      expect(rows.some((row) => row.stake_minor === 0)).toBe(true);
      expect(rows.some((row) => row.settled_at === definition.from)).toBe(true);
      expect(rows.some((row) => row.settled_at === definition.to)).toBe(true);
      expect(
        rows.some(
          (row) =>
            row.placed_at.startsWith(definition.emptyDay) ||
            row.settled_at?.startsWith(definition.emptyDay),
        ),
      ).toBe(false);
      const ggr = (provider: string, from: string, to: string) =>
        rows
          .filter(
            (row) =>
              row.provider_id === provider &&
              row.status === "settled" &&
              row.settled_at !== null &&
              row.settled_at >= from &&
              row.settled_at < to,
          )
          .reduce(
            (sum, row) => sum + row.stake_minor - (row.payout_minor ?? 0),
            0,
          );
      const changes = ["nova", "orbit", "pulse"].map((provider) => ({
        provider,
        change:
          ggr(provider, definition.current.from, definition.current.to) -
          ggr(provider, definition.previous.from, definition.previous.to),
      }));
      expect(changes.sort((a, b) => a.change - b.change)[0].provider).toBe(
        "nova",
      );
      expect(
        ggr("nova", definition.current.from, definition.current.to),
      ).toBeLessThan(0);
    });
  }
});
