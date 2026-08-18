import type { BtwRate } from "./btwRates";

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
  btwRate: BtwRate;
  totals: InvoiceTotals;
}
