# Project Rules

Durable, project-wide conventions for Arisoft. This file is imported automatically into every session via `@docs/rules.md` in `CLAUDE.md` — apply these rules without being asked again. Add new rules here as they come up; keep each entry short, dated, and scoped to what's actually durable (not one-off task details).

## UI

- **Pagination**: every list of records rendered in the UI (tables/lists of fetched or stored data — e.g. companies, contact persons, emails sent, and any future list) must use front-side (client-side) pagination: fetch/load the full data as usual, then paginate the already-loaded array in the browser. Do not implement server-side paged queries for this. _Added 2026-08-20._
