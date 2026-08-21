import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  var __dashboardDbPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DASHBOARD_DATABASE_URL;
  if (!connectionString) {
    throw new Error("DASHBOARD_DATABASE_URL is not configured.");
  }
  // Small per-instance ceiling: Amplify's Node.js SSR runtime may run
  // multiple concurrent instances, each opening its own pool, so keep this
  // low to avoid exhausting the database's total connection limit.
  //
  // ssl: local Postgres (dev) has no SSL enabled, so forcing it would break
  // local dev. Neon/Supabase (prod) need it, and rejectUnauthorized: false
  // because their cert chain isn't trusted by Node's default CA bundle in
  // Amplify's runtime, which recent pg versions reject outright (sslmode=require
  // now behaves like verify-full instead of its classic encrypt-only meaning).
  // The connection is still encrypted; this only skips CA-chain verification.
  const isLocalDb = /^(localhost|127\.0\.0\.1)$/.test(new URL(connectionString).hostname);
  return new Pool({
    connectionString,
    max: 5,
    ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
  });
}

// Pool creation is deferred to first call (not module load) so importing
// this module — e.g. when `next build` collects route data — never requires
// DASHBOARD_DATABASE_URL to be set. Only an actual query does. The pool itself
// is still reused across calls via the global cache.
export function getDb(): NodePgDatabase<typeof schema> {
  const pool = globalThis.__dashboardDbPool ?? createPool();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__dashboardDbPool = pool;
  }
  return drizzle(pool, { schema });
}
