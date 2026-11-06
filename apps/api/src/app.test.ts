import { expect, test } from "vitest";
import { createApp } from "./app";

test("returns the documented database response", async () => {
  const response = await createApp(async () => 1).request("/api/health");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    database: "connected",
    result: 1,
    runtime: "node",
    synthetic: true,
    exampleGgrMinor: -150,
  });
});
test("database failures are unavailable, never a fake success or a leaked secret", async () => {
  const response = await createApp(async () => {
    throw new Error("secret connection URL");
  }).request("/api/health");
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Database unavailable" });
});
test("unknown API paths stay JSON 404", async () => {
  expect((await createApp(async () => 1).request("/api/missing")).status).toBe(
    404,
  );
});
test("SSE has ordered events and buffering controls", async () => {
  const response = await createApp(async () => 1).request("/api/stream");
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  expect(response.headers.get("cache-control")).toContain("no-transform");
  expect(await response.text()).toMatch(/event: ready[\s\S]+event: complete/);
});

test("analytics rejects malformed, incompatible and oversized queries before database work", async () => {
  let calls = 0;
  const app = createApp(
    async () => 1,
    async () => {
      calls++;
      throw new Error("must not reach database");
    },
  );
  const valid = {
    from: "2026-09-22T00:00:00.000Z",
    to: "2026-09-29T00:00:00.000Z",
  };
  const cases = [
    ["summary", { from: "2026-02-30T00:00:00.000Z" }],
    ["summary", { to: valid.from }],
    ["summary", { from: "2026-09-22T01:00:00.000Z" }],
    ["summary", { brand: "unknown" }],
    ["summary", { provider: "unknown" }],
    ["summary", { status: "pending" }],
    ["summary", { basis: "placement" }],
    ["summary", { to: "2027-09-29T00:00:00.000Z" }],
    ["activity", { sort: "stake; DROP TABLE transactions" }],
    ["activity", { direction: "sideways" }],
    ["activity", { limit: "101" }],
    ["activity", { limit: "0" }],
    ["activity", { offset: "100001" }],
    ["activity", { offset: "1" }],
    ["activity", { limit: "2.5" }],
    ["activity", { status: "void" }],
    ["activity", { basis: "invalid" }],
    ["activity", { datasetHash: "oops" }],
    ["activity", { extra: "ignored?" }],
  ] as const;
  for (const [kind, override] of cases) {
    const response = await app.request(
      `/api/${kind}?${new URLSearchParams({ ...valid, ...override })}`,
    );
    expect(response.status, JSON.stringify(override)).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_QUERY", message: "Invalid analytics query" },
    });
  }
  expect(calls).toBe(0);
});

test("analytics errors are documented and do not expose database details", async () => {
  const { AnalyticsError } = await import("@opslens/analytics/service");
  const query = "?from=2026-09-22T00:00:00.000Z&to=2026-09-29T00:00:00.000Z";
  for (const [code, status] of [
    ["DATASET_CHANGED", 409],
    ["TIMEOUT", 504],
    ["CANCELLED", 408],
  ] as const) {
    const app = createApp(
      async () => 1,
      async () => {
        throw new AnalyticsError(code, "Expected failure");
      },
    );
    const response = await app.request(`/api/summary${query}`);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      error: { code, message: "Expected failure" },
    });
  }
  const app = createApp(
    async () => 1,
    async () => {
      throw new Error("postgresql://secret");
    },
  );
  const response = await app.request(`/api/activity${query}`);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("secret");
});

test("repeated scalar filters are rejected", async () => {
  const response = await createApp(async () => 1).request(
    "/api/activity?from=2026-09-22T00:00:00.000Z&to=2026-09-29T00:00:00.000Z&brand=harbor&brand=summit",
  );
  expect(response.status).toBe(400);
});

test("invalid analytics output fails closed", async () => {
  const app = createApp(
    async () => 1,
    async () => ({ current: { ggr: 10 } }),
  );
  const response = await app.request(
    "/api/summary?from=2026-09-22T00:00:00.000Z&to=2026-09-29T00:00:00.000Z",
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error: { code: "UNAVAILABLE", message: "Analytics unavailable" },
  });
});
