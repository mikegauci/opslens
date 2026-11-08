import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { fileURLToPath } from "node:url";
import { createOpenAI } from "@ai-sdk/openai";
import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { serveStatic } from "@hono/node-server/serve-static";
import { createAnalyticsService } from "@opslens/analytics/service";
import pg from "pg";
import { createApp } from "./app";
import type { CopilotProvider } from "./copilot";
import { createCopilotQuota } from "./copilot-quota";

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
function configureCopilot(): CopilotProvider | undefined {
  const modelId = process.env.OPSLENS_COPILOT_MODEL?.trim();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!modelId || !apiKey) return;
  const model = createOpenAI({ apiKey }).responses(modelId);
  const origin = process.env.OPSLENS_COPILOT_PUBLIC_ORIGIN;
  if (origin) {
    const secret = process.env.OPSLENS_COPILOT_QUOTA_SECRET;
    if (
      !origin.startsWith("https://") ||
      URL.parse(origin)?.origin !== origin ||
      !secret ||
      Buffer.byteLength(secret) < 32
    ) {
      console.error(
        "Public copilot requires an HTTPS origin and a quota secret of at least 32 bytes.",
      );
      return;
    }
    const reserve = createCopilotQuota(pool, secret);
    return {
      model,
      publicDemo: {
        origin,
        reserve: (context) => {
          const address = getConnInfo(context).remote.address?.replace(
            /^::ffff:/,
            "",
          );
          if (!address || !isIP(address)) throw new Error("No socket address");
          return reserve(address);
        },
      },
    };
  }
  if (host === "127.0.0.1" && process.env.OPSLENS_COPILOT_LOCAL === "1")
    return { model, allowedOrigin: `http://127.0.0.1:${port}` };
}
const copilot = configureCopilot();
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
