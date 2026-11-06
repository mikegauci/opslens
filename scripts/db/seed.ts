import { readFile } from "node:fs/promises";
import { artifact, generate } from "../data/dataset";
import { admin, replaceRows } from "./shared";

const count = Number(process.argv[2] ?? 100000);
const { manifest } = artifact(count);
const approved = JSON.parse(await readFile("data/manifest.json", "utf8"));
if (
  !approved.some(
    (entry: unknown) => JSON.stringify(entry) === JSON.stringify(manifest),
  )
)
  throw new Error("Unapproved dataset hash; regenerate and review manifest");
const client = admin();
await client.connect();
try {
  await client.query("BEGIN");
  await replaceRows(client, generate(count), manifest);
  await client.query("COMMIT");
  console.log(`Seeded ${count} rows; sha256 ${manifest.sha256}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
