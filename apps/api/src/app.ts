import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { grossGamingRevenue } from "@opslens/analytics";
import { streamSSE } from "hono/streaming";

export type DatabaseProbe = () => Promise<number>;
const responseSchema = z.object({
  database: z.literal("connected"),
  result: z.literal(1),
  runtime: z.literal("node"),
  synthetic: z.literal(true),
  exampleGgrMinor: z.number().int(),
});
const unavailableSchema = z.object({
  error: z.literal("Database unavailable"),
});
export function createApp(probe: DatabaseProbe) {
  const app = new OpenAPIHono();
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/health",
      operationId: "health",
      responses: {
        200: {
          description:
            "Real database connectivity probe; no analytics dataset yet",
          content: { "application/json": { schema: responseSchema } },
        },
        503: {
          description: "Database unavailable",
          content: { "application/json": { schema: unavailableSchema } },
        },
      },
    }),
    async (c) => {
      try {
        if ((await probe()) !== 1)
          throw new Error("Unexpected database probe result");
        return c.json(
          {
            database: "connected" as const,
            result: 1 as const,
            runtime: "node" as const,
            synthetic: true as const,
            exampleGgrMinor: grossGamingRevenue(100, 250),
          },
          200,
        );
      } catch {
        return c.json({ error: "Database unavailable" as const }, 503);
      }
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/stream",
      operationId: "streamProbe",
      responses: {
        200: {
          description:
            "Finite diagnostic SSE: ready, then complete. No AI provider.",
          content: { "text/event-stream": { schema: z.string() } },
        },
      },
    }),
    (c) => {
      c.header("X-Accel-Buffering", "no");
      const response = streamSSE(c, async (stream) => {
        await stream.writeSSE({ event: "ready", data: "Runtime connected" });
        await stream.sleep(200);
        if (!stream.aborted)
          await stream.writeSSE({ event: "complete", data: "Stream complete" });
      });
      // streamSSE sets its own cache header; preserve the no-transform directive afterward.
      response.headers.set("Cache-Control", "no-cache, no-transform");
      return response;
    },
  );
  app.doc("/api/openapi.json", {
    openapi: "3.0.0",
    info: { title: "OpsLens API", version: "0.1.0" },
  });
  app.notFound((c) => c.json({ error: "Not found" }, 404));
  return app;
}
