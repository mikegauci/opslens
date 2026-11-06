import { expect, test } from "vitest";
import { grossGamingRevenue } from "./index";

test("preserves negative GGR and zero in minor units", () => {
  expect(grossGamingRevenue(100, 250)).toBe(-150);
  expect(grossGamingRevenue(0, 0)).toBe(0);
});
test.each([1.5, -1, Number.MAX_SAFE_INTEGER + 1, Number.NaN])(
  "rejects invalid money %s",
  (amount) => {
    expect(() => grossGamingRevenue(amount, 0)).toThrow(RangeError);
    expect(() => grossGamingRevenue(0, amount)).toThrow(RangeError);
  },
);
