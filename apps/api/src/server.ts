import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
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
const app = createApp(async () => {
  const result = await pool.query<{ result: number }>(
    "SELECT 1::integer AS result",
  );
  return result.rows[0].result;
});
// Keep the location stable in both src/ and dist/.
const webRoot = fileURLToPath(new URL("../../web/dist/", import.meta.url));
app.get("/assets/*", serveStatic({ root: webRoot }));
app.get("/", serveStatic({ path: `${webRoot}index.html` }));
app.get("/foundation", serveStatic({ path: `${webRoot}index.html` }));
const port = Number(process.env.PORT ?? 3000);
const server = serve(
  { fetch: app.fetch, port, hostname: process.env.HOST ?? "127.0.0.1" },
  () => console.log(`OpsLens: http://127.0.0.1:${port}/foundation`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
