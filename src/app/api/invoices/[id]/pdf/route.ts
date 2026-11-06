import { invoiceRoute } from "@/lib/invoice/api";
import { renderInvoicePdf } from "@/lib/invoice/renderInvoicePdf";
import { InvoiceRejected } from "@/lib/invoice/request";
import { getInvoice } from "@/lib/invoice/store";

export const GET = invoiceRoute<{ id: string }>(async (_body, { id }) => {
  const invoice = await getInvoice(id);
  if (!invoice) throw new InvoiceRejected("Invoice not found.", 404);
  const pdf = await renderInvoicePdf(invoice);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${invoice.number}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
});
