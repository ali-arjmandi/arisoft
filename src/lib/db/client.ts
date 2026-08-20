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
  return new Pool({ connectionString, max: 5 });
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
