import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { isValidEmail } from "@/lib/dashboard/validate";
import { recordEmailSent, resolveEmailCompanyLink } from "@/lib/companies/emails";
import { getInboxMessage } from "@/lib/email/inbox";
import { renderEmailForSmtp, type RenderedEmail } from "@/lib/email/render";
import { buildReplyContent, replyReferences } from "@/lib/email/reply";
import { sendEmail } from "@/lib/email/sendEmail";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!body) {
    return NextResponse.json({ ok: false, error: "Reply text is required." }, { status: 400 });
  }

  const { id } = await params;
  const message = await getInboxMessage(id);
  if (!message) {
    return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 });
  }

  // Everything but the text comes from the stored message, never the client.
  const to = message.replyToAddress ?? message.fromAddress;
  if (!isValidEmail(to)) {
    return NextResponse.json({ ok: false, error: "This message has no address to reply to." }, { status: 400 });
  }
  const from = message.mailbox;
  const content = buildReplyContent({
    subject: message.subject,
    body,
    quotedFrom: message.fromName ?? to,
    quotedDate: message.receivedAt,
    quotedText: message.bodyText,
  });

  let rendered: RenderedEmail;
  try {
    rendered = renderEmailForSmtp(content);
  } catch (error) {
    console.error("inbox reply: failed to render:", error);
    return NextResponse.json({ ok: false, error: "Failed to render reply." }, { status: 500 });
  }

  try {
    await sendEmail({
      to,
      from,
      subject: content.subject,
      ...rendered,
      inReplyTo: message.messageId ?? undefined,
      references: replyReferences(message.references, message.messageId),
    });
  } catch (error) {
    console.error("inbox reply failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to send reply." }, { status: 502 });
  }

  try {
    const link = await resolveEmailCompanyLink(undefined, undefined, to);
    await recordEmailSent({ ...link, to, from, content });
  } catch (error) {
    // The reply already went out; a logging failure must not read as a send failure.
    console.error("inbox reply: failed to log:", error);
  }

  return NextResponse.json({ ok: true });
}
