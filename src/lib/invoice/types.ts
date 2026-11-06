import type { BtwRate } from "./btwRates";
import type { SellerInfo } from "./seller";

export type InvoiceKind = "invoice" | "credit_note";
// dutch_vat: Dutch rate, normal Dutch return. oss: the buyer's country rate.
export type VatMode = "dutch_vat" | "oss";
export type InvoiceEmailStatus = "pending" | "sending" | "sent" | "failed";

export interface StoredBuyer {
  email?: string;
  name?: string;
  country: string;
}

export interface StoredLine {
  description: string;
  quantity: number;
  // The whole line, not a price per unit.
  amountInclVatCents: number;
  amountExclVatCents: number;
  vatCents: number;
}

export interface StoredPayment {
  status: "paid" | "refunded";
  provider: string;
  reference: string;
  paidAt?: string;
}

export interface InvoiceFormValues {
  invoiceNumber: string;
  invoiceDate: string; // yyyy-mm-dd, from <input type="date">
  deliveryDate: string; // yyyy-mm-dd, "" if same as invoiceDate
  buyerName: string;
  buyerAddress: string; // free text, newline-separated
  description: string;
  amountExclBtw: string; // raw string while editing
  btwRate: BtwRate;
}

export interface InvoiceTotals {
  amountExclBtw: number;
  btwAmount: number;
  amountInclBtw: number;
}

export interface InvoiceDocumentData {
  invoiceNumber: string;
  invoiceDate: string;
  deliveryDate: string | null;
  buyerName: string;
  buyerAddressLines: string[];
  description: string;
  btwRate: number;
  totals: InvoiceTotals;
  // Set for stored invoices only; the dashboard form leaves these out.
  kind?: InvoiceKind;
  creditsNumber?: string;
  lines?: { description: string; amountExclBtw: number }[];
  paymentLines?: string[];
  seller?: SellerInfo;
}
