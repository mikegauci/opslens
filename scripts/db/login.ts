import { admin } from "./shared";

// Explicit provisioning command; migrations and seeds never store passwords.
const app = new URL(process.env.DATABASE_URL ?? "");
const migration = new URL(process.env.MIGRATION_DATABASE_URL ?? "");
if (
  app.username !== "opslens_app" ||
  !app.password ||
  app.hostname !== migration.hostname ||
  app.port !== migration.port ||
  app.pathname !== migration.pathname
) {
  throw new Error(
    "DATABASE_URL must identify opslens_app with a password on the migration database",
  );
}
const client = admin();
await client.connect();
try {
  await client.query(
    `ALTER ROLE opslens_app PASSWORD ${client.escapeLiteral(decodeURIComponent(app.password))}`,
  );
  console.log("Configured application login (password omitted)");
} finally {
  await client.end();
}
