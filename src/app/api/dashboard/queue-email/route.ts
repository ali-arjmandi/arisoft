import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { parseSendRequest } from "@/lib/dashboard/validate";
import { createGeneratedEmail, resolveEmailCompanyLink } from "@/lib/companies/emails";

export async function POST(request: NextRequest) {
  if (!(await requireDashboardAuth(request))) {
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
    companyId: formData.get("companyId"),
    contactPersonId: formData.get("contactPersonId"),
  });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.errors.join(" ") }, { status: 400 });
  }

  // Queued emails have no attachment storage (the emails.content jsonb
  // column doesn't carry files, and the queue's later "send" step never
  // attaches anything) — reject rather than silently dropping files.
  const uploadedFiles = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (uploadedFiles.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Attachments aren't supported for queued emails. Remove attachments, or use Send email instead.",
      },
      { status: 400 },
    );
  }

  const { to, from, content, companyId, contactPersonId } = parsed.data;

  try {
    const resolved = await resolveEmailCompanyLink(companyId, contactPersonId, to);
    const item = await createGeneratedEmail({
      companyId: resolved.companyId,
      contactPersonId: resolved.contactPersonId,
      to,
      from,
      content,
      status: "queued",
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    console.error("dashboard queue-email failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to queue email." }, { status: 500 });
  }
}
