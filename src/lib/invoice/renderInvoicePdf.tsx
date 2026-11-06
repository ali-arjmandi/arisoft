import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { registerInvoiceFonts } from "./fonts";
import { InvoiceDocument } from "./InvoiceDocument";
import { formatInvoiceDate } from "./format";
import { countryName } from "./request";
import { amsterdamDate, type InvoiceRow } from "./store";
import type { InvoiceDocumentData } from "./types";

const euros = (cents: number) => cents / 100;

function paymentLines({ kind, payment }: InvoiceRow): string[] {
  const provider = payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1);
  if (kind === "credit_note") {
    return [`Refunded via ${provider}. No payment is needed.`, `Original payment reference: ${payment.reference}`];
  }
  const paidOn = payment.paidAt ? ` on ${formatInvoiceDate(amsterdamDate(new Date(payment.paidAt)))}` : "";
  return [`Paid${paidOn} via ${provider}. No payment is needed.`, `Payment reference: ${payment.reference}`];
}

export function invoicePdfData(row: InvoiceRow): InvoiceDocumentData {
  const { buyer } = row;
  return {
    invoiceNumber: row.number,
    invoiceDate: amsterdamDate(row.issuedAt),
    deliveryDate: null,
    buyerName: buyer.name ?? buyer.email ?? "Customer",
    buyerAddressLines: [...(buyer.name && buyer.email ? [buyer.email] : []), countryName(buyer.country)],
    description: "",
    btwRate: Number(row.vatRate),
    totals: {
      amountExclBtw: euros(row.amountExclVatCents),
      btwAmount: euros(row.vatCents),
      amountInclBtw: euros(row.amountInclVatCents),
    },
    kind: row.kind,
    creditsNumber: row.creditsNumber ?? undefined,
    lines: row.lines.map((line) => ({
      description: line.quantity > 1 ? `${line.quantity} × ${line.description}` : line.description,
      amountExclBtw: euros(line.amountExclVatCents),
    })),
    paymentLines: paymentLines(row),
    seller: row.seller,
  };
}

// No Helvetica fallback here, unlike the dashboard's browser PDF: a stored
// invoice must always look the same, so a missing font fails and is retried.
export async function renderInvoicePdf(row: InvoiceRow): Promise<Buffer> {
  const publicDir = path.join(process.cwd(), "public");
  registerInvoiceFonts(publicDir);
  return renderToBuffer(
    <InvoiceDocument
      data={invoicePdfData(row)}
      logoSrc={path.join(publicDir, "images/logo/full-lockup-transparent-blue.png")}
    />,
  );
}
