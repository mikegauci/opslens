import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { grossGamingRevenue } from "@opslens/analytics";
import {
  activityQuery,
  errorSchema,
  metricQuery,
  responseSchemas,
} from "@opslens/analytics/schemas";
import {
  AnalyticsError,
  type AnalyticsService,
} from "@opslens/analytics/service";
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
export function createApp(probe: DatabaseProbe, analytics?: AnalyticsService) {
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
  for (const kind of [
    "summary",
    "trend",
    "contributions",
    "activity",
  ] as const) {
    app.use(`/api/${kind}`, async (c, next) => {
      const params = new URL(c.req.url).searchParams;
      if ([...params.keys()].some((key) => params.getAll(key).length > 1)) {
        return c.json(
          {
            error: {
              code: "INVALID_QUERY",
              message: "Repeated filters are not supported",
            },
          },
          400,
        );
      }
      await next();
    });
    app.openapi(
      createRoute({
        method: "get",
        path: `/api/${kind}`,
        operationId: kind,
        request: { query: kind === "activity" ? activityQuery : metricQuery },
        responses: {
          200: {
            description:
              "Analytics with effective scope and immutable dataset evidence",
            content: { "application/json": { schema: responseSchemas[kind] } },
          },
          400: {
            description: "Invalid or incompatible filters",
            content: { "application/json": { schema: errorSchema } },
          },
          409: {
            description: "Dataset changed; restart pagination",
            content: { "application/json": { schema: errorSchema } },
          },
          408: {
            description:
              "Request cancelled (response may not reach disconnected caller)",
            content: { "application/json": { schema: errorSchema } },
          },
          503: {
            description: "Analytics unavailable",
            content: { "application/json": { schema: errorSchema } },
          },
          504: {
            description: "Statement timeout",
            content: { "application/json": { schema: errorSchema } },
          },
        },
      }),
      async (c) => {
        c.header("Cache-Control", "no-store");
        try {
          if (!analytics)
            throw new AnalyticsError("UNAVAILABLE", "Analytics unavailable");
          const result = await analytics(kind, c.req.query(), c.req.raw.signal);
          return c.json(responseSchemas[kind].parse(result), 200);
        } catch (error) {
          const failure =
            error instanceof AnalyticsError
              ? error
              : new AnalyticsError("UNAVAILABLE", "Analytics unavailable");
          const status = {
            INVALID_QUERY: 400,
            DATASET_CHANGED: 409,
            UNAVAILABLE: 503,
            TIMEOUT: 504,
            CANCELLED: 408,
          } as const;
          return c.json(
            { error: { code: failure.code, message: failure.message } },
            status[failure.code],
          );
        }
      },
      (result, c) => {
        if (!result.success)
          return c.json(
            {
              error: {
                code: "INVALID_QUERY" as const,
                message: "Invalid analytics query",
              },
            },
            400,
          );
      },
    );
  }
  app.doc("/api/openapi.json", {
    openapi: "3.0.0",
    info: { title: "OpsLens API", version: "0.2.0" },
  });
  app.notFound((c) => c.json({ error: "Not found" }, 404));
  return app;
}
