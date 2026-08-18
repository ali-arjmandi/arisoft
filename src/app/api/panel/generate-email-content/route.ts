import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/panel/session";
import { generateEmailContent } from "@/lib/email/generateContent";

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

  const brief =
    typeof (body as { brief?: unknown } | null)?.brief === "string"
      ? (body as { brief: string }).brief.trim()
      : "";
  if (!brief) {
    return NextResponse.json({ ok: false, error: "Please describe the email you want." }, { status: 400 });
  }

  try {
    const content = await generateEmailContent(brief);
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    console.error("panel generate-email-content failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to generate email content." },
      { status: 502 },
    );
  }
}
