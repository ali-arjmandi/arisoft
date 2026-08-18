import { NextResponse, type NextRequest } from "next/server";
import { renderEmailForSmtp } from "@/lib/email/render";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/panel/session";
import { parseSendRequest } from "@/lib/panel/validate";
import { sendEmail } from "@/lib/email/sendEmail";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionCookie(cookie))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseSendRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.errors.join(" ") }, { status: 400 });
  }

  const { to, from, content } = parsed.data;

  let html: string;
  let attachments: ReturnType<typeof renderEmailForSmtp>["attachments"];
  try {
    ({ html, attachments } = renderEmailForSmtp(content));
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to render email." },
      { status: 400 },
    );
  }

  try {
    await sendEmail({ to, from, subject: content.subject, html, attachments });
  } catch (error) {
    console.error("panel send-email failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to send email." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
