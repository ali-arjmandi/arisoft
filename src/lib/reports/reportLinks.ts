import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companyReportLinks } from "@/lib/db/schema";

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

// Lazily creates the company's report-link token on first use, instead of
// generating one for every company up front. Safe under concurrent
// callers: the insert is a no-op on conflict (unique companyId), so a lost
// race just falls through to the re-select — same pattern as
// getQueueState() in src/lib/companyQueue/state.ts.
export async function getOrCreateReportToken(companyId: string): Promise<string> {
  const db = getDb();
  const [existing] = await db
    .select({ token: companyReportLinks.token })
    .from(companyReportLinks)
    .where(eq(companyReportLinks.companyId, companyId))
    .limit(1);
  if (existing) return existing.token;

  const inserted = await db
    .insert(companyReportLinks)
    .values({ companyId, token: generateToken() })
    .onConflictDoNothing()
    .returning({ token: companyReportLinks.token });
  if (inserted[0]) return inserted[0].token;

  const [row] = await db
    .select({ token: companyReportLinks.token })
    .from(companyReportLinks)
    .where(eq(companyReportLinks.companyId, companyId))
    .limit(1);
  return row.token;
}

export async function getCompanyIdByReportToken(token: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ companyId: companyReportLinks.companyId })
    .from(companyReportLinks)
    .where(eq(companyReportLinks.token, token))
    .limit(1);
  return row?.companyId ?? null;
}

export function getPublicSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://arisoft.nl";
}

export async function getOrCreateReportUrl(companyId: string): Promise<string> {
  const token = await getOrCreateReportToken(companyId);
  return `${getPublicSiteUrl()}/report/${token}`;
}
