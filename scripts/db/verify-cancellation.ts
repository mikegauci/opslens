import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import pg from "pg";
import { createAnalyticsService } from "../../packages/analytics/src/service";

export async function verifyCancellation(owner: pg.Client) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 3000,
    statement_timeout: 3000,
  });
  const service = createAnalyticsService(pool);
  const query = {
    from: "2026-09-22T00:00:00.000Z",
    to: "2026-09-29T00:00:00.000Z",
  };
  try {
    for (const mode of ["cancel", "timeout"]) {
      const pid = (await pool.query("SELECT pg_backend_pid() AS pid")).rows[0]
        .pid;
      await owner.query("BEGIN");
      await owner.query(
        "LOCK TABLE opslens_private.dataset IN ACCESS EXCLUSIVE MODE",
      );
      try {
        const controller = new AbortController();
        const pending = assert.rejects(
          service("summary", query, controller.signal),
          (error: { code: string }) =>
            error.code === (mode === "cancel" ? "CANCELLED" : "TIMEOUT"),
        );
        let blocked = false;
        for (let i = 0; i < 100; i++) {
          // pg_stat_activity is refreshed per command outside a cached stats snapshot.
          await owner.query("SELECT pg_stat_clear_snapshot()");
          blocked = (
            await owner.query(
              "SELECT wait_event_type = 'Lock' AS blocked FROM pg_stat_activity WHERE pid = $1",
              [pid],
            )
          ).rows[0]?.blocked;
          if (blocked) break;
          await setTimeout(10);
        }
        assert.ok(
          blocked,
          "Real analytics statement must be running and waiting on the controlled lock",
        );
        if (mode === "cancel") controller.abort();
        await pending;
      } finally {
        await owner.query("ROLLBACK");
      }
      assert.equal(
        (await pool.query("SELECT 1 AS n")).rows[0].n,
        1,
        "Pool recovers after failure",
      );
    }
    const leased = await pool.connect();
    const controller = new AbortController();
    const pending = service("summary", query, controller.signal);
    controller.abort();
    leased.release();
    await assert.rejects(
      pending,
      (error: { code: string }) => error.code === "CANCELLED",
    );
    assert.equal((await pool.query("SELECT 1 AS n")).rows[0].n, 1);
    console.log(
      "Real blocked query cancellation, 3s timeout, cancellation during pool wait and connection recovery verified",
    );
  } finally {
    await owner.query("ROLLBACK");
    await pool.end();
  }
}
