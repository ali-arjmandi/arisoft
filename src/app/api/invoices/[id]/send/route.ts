import { invoiceRoute } from "@/lib/invoice/api";
import { InvoiceRejected } from "@/lib/invoice/request";
import { getInvoice, queueInvoiceEmail } from "@/lib/invoice/store";

// 202: the next /api/cron/tick sends it.
export const POST = invoiceRoute<{ id: string }>(async (_body, { id }) => {
  const invoice = await getInvoice(id);
  if (!invoice) throw new InvoiceRejected("Invoice not found.", 404);
  if (!invoice.buyer.email) throw new InvoiceRejected("This invoice has no email address.");
  await queueInvoiceEmail(invoice.id);
  return new Response(null, { status: 202 });
});
