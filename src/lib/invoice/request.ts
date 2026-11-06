import type { InvoiceKind, StoredBuyer, StoredPayment } from "./types";

// HSM treats a 4xx as final, so this is only ever thrown for data that a retry
// cannot fix. Messages never echo a value: HSM logs them.
export class InvoiceRejected extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
  }
}

export interface InvoiceRequest {
  series: "HSM" | "TEST";
  idempotencyKey: string;
  kind: InvoiceKind;
  creditsInvoiceId?: string;
  issuedAt: Date;
  sendEmail: boolean;
  buyer: StoredBuyer;
  lines: { description: string; quantity: number; amountInclVatCents: number }[];
  payment: StoredPayment;
}

const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const asObject = (value: unknown, name: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InvoiceRejected(`${name} is required.`);
  return value as Record<string, unknown>;
};
const asText = (value: unknown, name: string): string => {
  if (!isText(value)) throw new InvoiceRejected(`${name} is required.`);
  return value;
};
const asOptionalText = (value: unknown, name: string): string | undefined =>
  value === undefined || value === null ? undefined : asText(value, name);
const asDate = (value: unknown, name: string): Date => {
  const date = new Date(asText(value, name));
  if (Number.isNaN(date.getTime())) throw new InvoiceRejected(`${name} is not a date.`);
  return date;
};

const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

export function countryName(code: string): string {
  return REGION_NAMES.of(code) ?? code;
}

function parseCountry(value: unknown): string {
  const country = asText(value, "buyer.country");
  if (!/^[A-Z]{2}$/.test(country) || !REGION_NAMES.of(country)) {
    throw new InvoiceRejected("buyer.country is not an ISO 3166-1 alpha-2 code.");
  }
  return country;
}

export function parseInvoiceRequest(value: unknown): InvoiceRequest {
  const body = asObject(value, "body");
  const buyer = asObject(body.buyer, "buyer");
  const payment = asObject(body.payment, "payment");

  const { series, kind } = body;
  if (series !== "HSM" && series !== "TEST") throw new InvoiceRejected("series is not known.");
  if (kind !== "invoice" && kind !== "credit_note") throw new InvoiceRejected("kind is not known.");
  const isCredit = kind === "credit_note";

  if (typeof body.sendEmail !== "boolean") throw new InvoiceRejected("sendEmail is required.");
  if (payment.status !== (isCredit ? "refunded" : "paid")) throw new InvoiceRejected("payment.status does not fit kind.");

  const email = asOptionalText(buyer.email, "buyer.email");
  if (email !== undefined && !email.includes("@")) throw new InvoiceRejected("buyer.email is not an address.");

  if (!Array.isArray(body.lines) || body.lines.length === 0) throw new InvoiceRejected("lines is required.");
  const lines = body.lines.map((raw: unknown) => {
    const line = asObject(raw, "line");
    const { quantity, amountInclVatCents } = line;
    if (!Number.isSafeInteger(quantity) || (quantity as number) < 1) throw new InvoiceRejected("line.quantity is not valid.");
    if (!Number.isSafeInteger(amountInclVatCents)) throw new InvoiceRejected("line.amountInclVatCents is not valid.");
    const cents = amountInclVatCents as number;
    if (isCredit ? cents >= 0 : cents <= 0) throw new InvoiceRejected("line.amountInclVatCents has the wrong sign.");
    return { description: asText(line.description, "line.description"), quantity: quantity as number, amountInclVatCents: cents };
  });

  const paidAt = asOptionalText(payment.paidAt, "payment.paidAt");
  if (paidAt !== undefined) asDate(paidAt, "payment.paidAt");

  const creditsInvoiceId = asOptionalText(body.creditsInvoiceId, "creditsInvoiceId");
  if (isCredit && !creditsInvoiceId) throw new InvoiceRejected("creditsInvoiceId is required on a credit note.");

  return {
    series,
    idempotencyKey: asText(body.idempotencyKey, "idempotencyKey"),
    kind,
    creditsInvoiceId: isCredit ? creditsInvoiceId : undefined,
    issuedAt: asDate(body.issuedAt, "issuedAt"),
    sendEmail: body.sendEmail,
    buyer: { email, name: asOptionalText(buyer.name, "buyer.name"), country: parseCountry(buyer.country) },
    lines,
    payment: {
      status: payment.status as StoredPayment["status"],
      provider: asText(payment.provider, "payment.provider"),
      reference: asText(payment.reference, "payment.reference"),
      paidAt,
    },
  };
}
