import { defineConfig } from "drizzle-kit";

// Migrations are never applied automatically (not wired into amplify.yml).
// Generate with `npm run db:generate`, review the emitted SQL under
// drizzle/migrations, then apply deliberately with `npm run db:migrate`
// against whichever DASHBOARD_DATABASE_URL is active — a developer must point
// it at production explicitly when ready to ship a schema change.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DASHBOARD_DATABASE_URL!,
  },
});
