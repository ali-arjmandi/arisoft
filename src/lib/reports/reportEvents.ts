import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { reportEvents } from "@/lib/db/schema";
import type { ReportEventType } from "./reportEventType";

export async function recordReportEvent(companyId: string, type: ReportEventType): Promise<void> {
  const db = getDb();
  await db.insert(reportEvents).values({ companyId, type });
}

export interface ReportEngagement {
  viewCount: number;
  downloadCount: number;
  lastViewedAt: Date | null;
  lastDownloadedAt: Date | null;
}

export async function getReportEngagement(companyId: string): Promise<ReportEngagement> {
  const db = getDb();
  const [row] = await db
    .select({
      viewCount: sql<number>`count(*) filter (where ${reportEvents.type} = 'view')`,
      downloadCount: sql<number>`count(*) filter (where ${reportEvents.type} = 'download')`,
      lastViewedAt: sql<Date | null>`max(${reportEvents.createdAt}) filter (where ${reportEvents.type} = 'view')`,
      lastDownloadedAt: sql<Date | null>`max(${reportEvents.createdAt}) filter (where ${reportEvents.type} = 'download')`,
    })
    .from(reportEvents)
    .where(eq(reportEvents.companyId, companyId));

  return {
    viewCount: Number(row.viewCount),
    downloadCount: Number(row.downloadCount),
    lastViewedAt: row.lastViewedAt,
    lastDownloadedAt: row.lastDownloadedAt,
  };
}
