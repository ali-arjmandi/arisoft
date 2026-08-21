import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard/session";
import { addQueueItems } from "@/lib/companyQueue/queue";
import { parseCompanyQueueCsv } from "@/lib/companyQueue/csvImport";

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

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No CSV file provided." }, { status: 400 });
  }

  const csvText = await file.text();
  const { rows, errors } = parseCompanyQueueCsv(csvText);

  if (rows.length === 0 && errors.length > 0 && errors[0].row === 0) {
    return NextResponse.json({ ok: false, error: errors[0].message }, { status: 400 });
  }

  const imported = await addQueueItems(rows);
  return NextResponse.json({ ok: true, imported, skipped: errors }, { status: 201 });
}
