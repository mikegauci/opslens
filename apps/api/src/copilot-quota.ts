import { createHmac } from "node:crypto";
import type { Pool } from "pg";

export function createCopilotQuota(pool: Pool, secret: string) {
  return async (address: string) => {
    const visitor = createHmac("sha256", secret).update(address).digest("hex");
    const client = await pool.connect();
    let committed = false;
    try {
      // Keep the role's default read-only for all other application work.
      await client.query("BEGIN READ WRITE");
      const result = await client.query<{ allowed: boolean }>(
        "SELECT opslens_private.reserve_copilot_request($1) AS allowed",
        [visitor],
      );
      await client.query("COMMIT");
      committed = true;
      return result.rows[0]?.allowed === true;
    } finally {
      // Destroy a failed connection, including any open transaction.
      client.release(!committed);
    }
  };
}
