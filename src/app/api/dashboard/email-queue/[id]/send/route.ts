import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { getQueuedEmailById, markEmailSent } from "@/lib/companies/emails";
import { renderEmailForSmtp } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/sendEmail";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const queued = await getQueuedEmailById(id);
  if (!queued) {
    return NextResponse.json({ ok: false, error: "Queued email not found." }, { status: 404 });
  }

  const { html, attachments } = renderEmailForSmtp(queued.content);

  try {
    await sendEmail({
      to: queued.contactEmailSnapshot,
      from: queued.fromSender,
      subject: queued.content.subject,
      html,
      attachments,
    });
  } catch (error) {
    console.error("email-queue send failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to send email." }, { status: 502 });
  }

  const item = await markEmailSent(id);
  return NextResponse.json({ ok: true, item });
}
