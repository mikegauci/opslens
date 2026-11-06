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
