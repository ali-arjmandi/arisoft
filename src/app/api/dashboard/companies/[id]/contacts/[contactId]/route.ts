import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { deleteContactPerson, updateContactPerson } from "@/lib/companies/contactPersons";
import { parseContactPersonInput } from "@/lib/companies/validate";

interface RouteParams {
  params: Promise<{ id: string; contactId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id, contactId } = await params;

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

  const contact = await updateContactPerson(id, contactId, parsed.data);
  if (!contact) {
    return NextResponse.json({ ok: false, error: "Contact not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, contact });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!(await requireDashboardAuth(request))) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id, contactId } = await params;
  const deleted = await deleteContactPerson(id, contactId);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Contact not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
