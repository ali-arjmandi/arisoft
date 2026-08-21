// Applies pending migrations using drizzle-orm's migrator directly instead of
// `drizzle-kit migrate`. The drizzle-kit CLI swallows the underlying error on
// failure (its progress view ignores the error passed to it and just exits
// 1), which made CI failures impossible to diagnose. This script lets the
// real error reach the log.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connectionString = process.env.DASHBOARD_DATABASE_URL;
if (!connectionString) {
  console.error("DASHBOARD_DATABASE_URL is not configured.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrations applied successfully.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
