import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createOpenAI } from "@ai-sdk/openai";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createAnalyticsService } from "@opslens/analytics/service";
import pg from "pg";
import { createApp } from "./app";

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required; see .env.example");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 3000,
  statement_timeout: 3000,
  idleTimeoutMillis: 10000,
});
pool.on("error", () => console.error("Idle database connection failed"));
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const modelId = process.env.OPSLENS_COPILOT_MODEL;
const copilot =
  host === "127.0.0.1" &&
  process.env.OPSLENS_COPILOT_LOCAL === "1" &&
  modelId &&
  process.env.OPENAI_API_KEY
    ? {
        model: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).responses(
          modelId,
        ),
        allowedOrigin: `http://127.0.0.1:${port}`,
      }
    : undefined;
const app = createApp(
  async () => {
    const result = await pool.query<{ result: number }>(
      "SELECT 1::integer AS result",
    );
    return result.rows[0].result;
  },
  createAnalyticsService(pool),
  copilot,
);
// Keep the location stable in both src/ and dist/.
const webRoot = fileURLToPath(new URL("../../web/dist/", import.meta.url));
app.get("/assets/*", serveStatic({ root: webRoot }));
app.get("/", serveStatic({ path: `${webRoot}index.html` }));
app.get("/activity", serveStatic({ path: `${webRoot}index.html` }));
app.get("/foundation", serveStatic({ path: `${webRoot}index.html` }));
const knowledgeRoot = fileURLToPath(
  new URL("../../../knowledge/documents/", import.meta.url),
);
app.get("/knowledge/documents/:name", async (c) => {
  const name = c.req.param("name");
  if (!/^[a-z0-9-]+\.md$/.test(name)) return c.notFound();
  const source = await readFile(`${knowledgeRoot}${name}`, "utf8").catch(
    () => null,
  );
  if (source === null) return c.notFound();
  c.header("X-Content-Type-Options", "nosniff");
  return c.text(source);
});
const server = serve({ fetch: app.fetch, port, hostname: host }, () =>
  console.log(`OpsLens: http://127.0.0.1:${port}/foundation`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
