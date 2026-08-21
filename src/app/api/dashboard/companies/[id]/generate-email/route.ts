import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { getCompanyWithDetails } from "@/lib/companies/companies";
import { createGeneratedEmail } from "@/lib/companies/emails";
import { generateOutreachEmail } from "@/lib/companyAnalyzer/generateOutreachEmail";
import { content as defaultContent } from "@/lib/email/content";
import { ALLOWED_SENDERS } from "@/lib/email/senders";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const details = await getCompanyWithDetails(id);
  if (!details) {
    return NextResponse.json({ ok: false, error: "Company not found." }, { status: 404 });
  }

  // Prefer the general email found during research (matches the company
  // queue's automated behavior); fall back to the first contact person
  // with an email on file so this still works for companies where research
  // only found named decision makers.
  const generalEmail = details.company.analysis.contact.generalEmail;
  const fallbackContact = generalEmail ? undefined : details.contacts.find((contact) => contact.email);
  const to = generalEmail ?? fallbackContact?.email ?? null;

  if (!to) {
    return NextResponse.json(
      { ok: false, error: "No recipient email found. Add a contact person's email first." },
      { status: 400 },
    );
  }

  try {
    const generated = await generateOutreachEmail(details.company.analysis, id);
    const item = await createGeneratedEmail({
      companyId: id,
      contactPersonId: fallbackContact?.id,
      to,
      from: ALLOWED_SENDERS[0],
      // Off by default — generated drafts shouldn't carry an unsubscribe
      // link until someone deliberately enables it while editing.
      content: { ...defaultContent, ...generated, unsubscribeUrl: "" },
      status: "draft",
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    console.error("dashboard companies generate-email failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to generate email." },
      { status: 502 },
    );
  }
}
