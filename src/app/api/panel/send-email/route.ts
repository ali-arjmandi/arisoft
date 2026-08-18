import { NextResponse, type NextRequest } from "next/server";
import { renderEmailForSmtp, type EmailAttachment } from "@/lib/email/render";
import { validateAttachments } from "@/lib/email/attachments";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/panel/session";
import { parseSendRequest } from "@/lib/panel/validate";
import { sendEmail } from "@/lib/email/sendEmail";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionCookie(cookie))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  let contentInput: unknown;
  try {
    contentInput = JSON.parse(String(formData.get("content") ?? "null"));
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid email content." }, { status: 400 });
  }

  const parsed = parseSendRequest({
    to: formData.get("to"),
    from: formData.get("from"),
    content: contentInput,
  });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.errors.join(" ") }, { status: 400 });
  }

  const uploadedFiles = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  const attachmentErrors = validateAttachments(uploadedFiles);
  if (attachmentErrors.length > 0) {
    return NextResponse.json({ ok: false, error: attachmentErrors.join(" ") }, { status: 400 });
  }

  const { to, from, content } = parsed.data;

  let html: string;
  let attachments: EmailAttachment[];
  try {
    ({ html, attachments } = renderEmailForSmtp(content));
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to render email." },
      { status: 400 },
    );
  }

  const fileAttachments: EmailAttachment[] = await Promise.all(
    uploadedFiles.map(async (file) => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    })),
  );

  try {
    await sendEmail({
      to,
      from,
      subject: content.subject,
      html,
      attachments: [...attachments, ...fileAttachments],
    });
  } catch (error) {
    console.error("panel send-email failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to send email." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
