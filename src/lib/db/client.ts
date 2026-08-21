import { Pool } from "pg";
import { parse as parseConnectionString } from "pg-connection-string";
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
  // Parsed into discrete fields (host/port/etc.) rather than passed as
  // `connectionString` directly: when both `connectionString` and `ssl` are
  // given, pg's ConnectionParameters re-parses the connection string and
  // merges its own `ssl` (derived from sslmode=require in the URL) *over*
  // ours, silently discarding the override below.
  const parsed = parseConnectionString(connectionString);
  // ssl: local Postgres (dev) has no SSL enabled, so forcing it would break
  // local dev. Neon/Supabase (prod) need it, and rejectUnauthorized: false
  // because their cert chain isn't trusted by Node's default CA bundle in
  // Amplify's runtime, which recent pg versions reject outright (sslmode=require
  // now behaves like verify-full instead of its classic encrypt-only meaning).
  // The connection is still encrypted; this only skips CA-chain verification.
  const isLocalDb = parsed.host === "localhost" || parsed.host === "127.0.0.1";
  return new Pool({
    ...parsed,
    host: parsed.host ?? undefined,
    database: parsed.database ?? undefined,
    port: parsed.port ? Number(parsed.port) : undefined,
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
