import { defineConfig } from "drizzle-kit";

// Generate with `npm run db:generate` and review the emitted SQL under
// drizzle/migrations before committing. Applying against prod happens once
// per deploy via `db:migrate:ci` in amplify.yml (using the console-configured
// DASHBOARD_DATABASE_URL) — not at app/Lambda startup, since SSR runs as
// multiple concurrent Lambda instances that would race to apply the same
// migration. For local/manual runs against another DB, use `npm run
// db:migrate`, which reads DASHBOARD_DATABASE_URL from .env.local instead.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DASHBOARD_DATABASE_URL!,
  },
});
