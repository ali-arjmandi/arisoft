import { invoiceRoute } from "@/lib/invoice/api";
import { InvoiceRejected, parseInvoiceRequest } from "@/lib/invoice/request";
import { createInvoice, invoiceResponse } from "@/lib/invoice/store";

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new InvoiceRejected("The body is not JSON.", 400);
  }
}

export const POST = invoiceRoute<object>(async (body) => {
  const { invoice, created } = await createInvoice(parseInvoiceRequest(parseBody(body)));
  return Response.json(invoiceResponse(invoice), { status: created ? 201 : 200 });
});
