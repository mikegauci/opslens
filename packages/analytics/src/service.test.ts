import { expect, test } from "vitest";
import { safeInteger } from "./service";

test("database bigint conversion rejects silent money precision loss", () => {
  expect(safeInteger("9007199254740991")).toBe(Number.MAX_SAFE_INTEGER);
  expect(() => safeInteger("9007199254740992")).toThrow("precision");
  expect(() => safeInteger(-9007199254740992n)).toThrow("precision");
});
