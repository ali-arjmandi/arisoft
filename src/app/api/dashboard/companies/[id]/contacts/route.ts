import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { createContactPerson } from "@/lib/companies/contactPersons";
import { parseContactPersonInput } from "@/lib/companies/validate";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseContactPersonInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.errors.join(" ") }, { status: 400 });
  }

  const contact = await createContactPerson(id, parsed.data);
  if (!contact) {
    return NextResponse.json({ ok: false, error: "Company not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, contact }, { status: 201 });
}
