import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { invoiceCounters, invoiceEmails, invoices, vatAlerts } from "@/lib/db/schema";
import { InvoiceRejected, type InvoiceRequest } from "./request";
import { SELLER } from "./seller";
import type { StoredLine } from "./types";
import { chooseVat, OSS_THRESHOLD_CENTS, OSS_WARNING_CENTS, splitGross, type VatChoice } from "./vatRates";

export type InvoiceRow = typeof invoices.$inferSelect;
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

const scopeOf = (series: string) => (series === "TEST" ? "test" : "live");

/** yyyy-mm-dd in the Netherlands: 23:30 UTC on 31 December is already next year there. */
export function amsterdamDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(date);
}

export function invoiceResponse(row: InvoiceRow) {
  return {
    id: row.id,
    number: row.number,
    vatRate: Number(row.vatRate),
    amountExclVatCents: row.amountExclVatCents,
    vatCents: row.vatCents,
    amountInclVatCents: row.amountInclVatCents,
  };
}

// EU sales outside the Netherlands, excl. VAT, as invoices record them. Credit
// notes count against the year of the sale they refund. TEST only ever counts
// TEST, so a test run can never move the real total.
async function soldInEu(tx: Tx, series: string, year: number) {
  const rows = await tx
    .select({
      year: invoices.vatYear,
      cents: sql<string>`coalesce(sum(${invoices.amountExclVatCents}), 0)`,
      ossUsed: sql<boolean>`coalesce(bool_or(${invoices.vatMode} = 'oss'), false)`,
    })
    .from(invoices)
    .where(
      and(
        series === "TEST" ? eq(invoices.series, "TEST") : ne(invoices.series, "TEST"),
        eq(invoices.euCrossBorder, true),
        inArray(invoices.vatYear, [year, year - 1]),
      ),
    )
    .groupBy(invoices.vatYear);
  const thisYear = rows.find((row) => row.year === year);
  const lastYear = rows.find((row) => row.year === year - 1);
  return {
    soldThisYearCents: Number(thisYear?.cents ?? 0),
    soldLastYearCents: Number(lastYear?.cents ?? 0),
    ossUsedThisYear: thisYear?.ossUsed ?? false,
  };
}

async function nextNumber(tx: Tx, series: string, year: number): Promise<string> {
  const [counter] = await tx
    .insert(invoiceCounters)
    .values({ series, year, lastNumber: 1 })
    .onConflictDoUpdate({
      target: [invoiceCounters.series, invoiceCounters.year],
      set: { lastNumber: sql`${invoiceCounters.lastNumber} + 1` },
    })
    .returning({ lastNumber: invoiceCounters.lastNumber });
  return `${series}-${year}-${String(counter.lastNumber).padStart(4, "0")}`;
}

async function creditedInvoice(tx: Tx, input: InvoiceRequest): Promise<InvoiceRow> {
  const [credited] = await tx.select().from(invoices).where(eq(invoices.id, input.creditsInvoiceId!)).limit(1);
  if (!credited) throw new InvoiceRejected("creditsInvoiceId is not known.");
  if (credited.kind !== "invoice") throw new InvoiceRejected("A credit note can only credit an invoice.");
  if (credited.series !== input.series) throw new InvoiceRejected("A credit note must use the series of its invoice.");
  return credited;
}

async function raiseVatAlerts(tx: Tx, row: InvoiceRow, soldThisYearCents: number, choice: VatChoice) {
  const totalCents = soldThisYearCents + row.amountExclVatCents;
  const levels = [
    ...(totalCents >= OSS_WARNING_CENTS ? [OSS_WARNING_CENTS] : []),
    ...(choice.switchedToOss ? [OSS_THRESHOLD_CENTS] : []),
  ];
  for (const levelCents of levels) {
    await tx
      .insert(vatAlerts)
      .values({ scope: scopeOf(row.series), year: row.vatYear, levelCents, invoiceNumber: row.number, totalCents })
      .onConflictDoNothing();
  }
}

export async function createInvoice(input: InvoiceRequest): Promise<{ invoice: InvoiceRow; created: boolean }> {
  return getDb().transaction(async (tx) => {
    // One issuer at a time: the key check, the threshold total and the number
    // must all see the same state, and nothing is consumed by a repeat.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('arisoft-invoices'))`);

    // No comparing the body: HSM sends a new issuedAt on every retry.
    const [existing] = await tx.select().from(invoices).where(eq(invoices.idempotencyKey, input.idempotencyKey)).limit(1);
    if (existing) return { invoice: existing, created: false };

    // VAT follows the sale: HSM can retry for a week, across a rate change or New Year.
    const saleDate = amsterdamDate(input.payment.paidAt ? new Date(input.payment.paidAt) : input.issuedAt);
    const vatYear = Number(saleDate.slice(0, 4));
    const grossCents = input.lines.reduce((sum, line) => sum + line.amountInclVatCents, 0);

    const credited = input.kind === "credit_note" ? await creditedInvoice(tx, input) : undefined;
    const sold = credited ? undefined : await soldInEu(tx, input.series, vatYear);
    const choice: VatChoice = credited
      ? { rate: Number(credited.vatRate), mode: credited.vatMode, euCrossBorder: credited.euCrossBorder, switchedToOss: false }
      : chooseVat({ country: input.buyer.country, saleDate, grossCents, ...sold! });

    const lines: StoredLine[] = input.lines.map((line) => {
      const { netCents, vatCents } = splitGross(line.amountInclVatCents, choice.rate);
      return { ...line, amountExclVatCents: netCents, vatCents };
    });

    const issuedYear = Number(amsterdamDate(input.issuedAt).slice(0, 4));
    const [invoice] = await tx
      .insert(invoices)
      .values({
        id: `inv_${randomUUID().replaceAll("-", "")}`,
        series: input.series,
        number: await nextNumber(tx, input.series, issuedYear),
        kind: input.kind,
        idempotencyKey: input.idempotencyKey,
        creditsInvoiceId: credited?.id,
        creditsNumber: credited?.number,
        issuedAt: input.issuedAt,
        vatYear,
        vatRate: String(choice.rate),
        vatMode: choice.mode,
        euCrossBorder: choice.euCrossBorder,
        amountExclVatCents: lines.reduce((sum, line) => sum + line.amountExclVatCents, 0),
        vatCents: lines.reduce((sum, line) => sum + line.vatCents, 0),
        amountInclVatCents: grossCents,
        buyer: input.buyer,
        seller: SELLER,
        lines,
        payment: input.payment,
      })
      .returning();

    if (input.sendEmail && input.buyer.email) await tx.insert(invoiceEmails).values({ invoiceId: invoice.id });
    if (sold && choice.euCrossBorder) await raiseVatAlerts(tx, invoice, sold.soldThisYearCents, choice);
    return { invoice, created: true };
  });
}

export async function getInvoice(id: string): Promise<InvoiceRow | undefined> {
  const [invoice] = await getDb().select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return invoice;
}

export async function queueInvoiceEmail(invoiceId: string): Promise<void> {
  // The database's clock, as the claim compares next_try_at with its now().
  const reset = { status: "pending" as const, attempts: 0, nextTryAt: sql`now()`, claimedAt: null };
  await getDb()
    .insert(invoiceEmails)
    .values({ invoiceId, ...reset })
    .onConflictDoUpdate({ target: invoiceEmails.invoiceId, set: reset });
}
