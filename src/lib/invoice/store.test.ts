import assert from "node:assert/strict";
import { after, before, beforeEach, mock, test } from "node:test";
import nodemailer from "nodemailer";
import type { InvoiceRequest } from "./request";

// Needs a real Postgres: row locks and rollbacks are what is being tested. Set
// TEST_DATABASE_URL to a throwaway, migrated database. Only TEST rows are touched.
const databaseUrl = process.env.TEST_DATABASE_URL;
const skip = databaseUrl ? false : "TEST_DATABASE_URL is not set";

let store: typeof import("./store");
let db: ReturnType<typeof import("@/lib/db/client").getDb>;
let schema: typeof import("@/lib/db/schema");
let eq: typeof import("drizzle-orm").eq;
let sql: typeof import("drizzle-orm").sql;

before(async () => {
  if (!databaseUrl) return;
  process.env.DASHBOARD_DATABASE_URL = databaseUrl;
  store = await import("./store");
  schema = await import("@/lib/db/schema");
  ({ eq, sql } = await import("drizzle-orm"));
  db = (await import("@/lib/db/client")).getDb();
});

beforeEach(async () => {
  if (!databaseUrl) return;
  await db.delete(schema.vatAlerts).where(eq(schema.vatAlerts.scope, "test"));
  await db.execute(sql`delete from invoice_emails where invoice_id in (select id from invoices where series = 'TEST')`);
  await db.delete(schema.invoices).where(eq(schema.invoices.series, "TEST"));
  await db.delete(schema.invoiceCounters).where(eq(schema.invoiceCounters.series, "TEST"));
});

after(async () => {
  if (databaseUrl) await globalThis.__dashboardDbPool?.end();
});

let key = 0;
const invoice = (overrides: Partial<InvoiceRequest> = {}, cents = 3500): InvoiceRequest => ({
  series: "TEST",
  idempotencyKey: `key-${(key += 1)}`,
  kind: "invoice",
  issuedAt: new Date("2026-11-02T10:15:00.000Z"),
  sendEmail: true,
  buyer: { email: "user@example.com", country: "DE" },
  lines: [{ description: "Pass", quantity: 1, amountInclVatCents: cents }],
  payment: { status: "paid", provider: "mollie", reference: "tr_1", paidAt: "2026-11-02T10:14:51.000Z" },
  ...overrides,
});

const refund = (creditsInvoiceId: string, cents: number): InvoiceRequest =>
  invoice({
    kind: "credit_note",
    creditsInvoiceId,
    payment: { status: "refunded", provider: "mollie", reference: "tr_1", paidAt: "2026-11-02T10:14:51.000Z" },
    lines: [{ description: "Refund", quantity: 1, amountInclVatCents: cents }],
  });

const emailRows = async (id: string) => db.select().from(schema.invoiceEmails).where(eq(schema.invoiceEmails.invoiceId, id));

test("numbers start at 0001 under TEST and the rate is Dutch for an EU buyer", { skip }, async () => {
  const { invoice: row, created } = await store.createInvoice(invoice());
  assert.equal(created, true);
  assert.equal(row.number, "TEST-2026-0001");
  assert.deepEqual(store.invoiceResponse(row), {
    id: row.id,
    number: "TEST-2026-0001",
    vatRate: 21,
    amountExclVatCents: 2893,
    vatCents: 607,
    amountInclVatCents: 3500,
  });
  assert.equal(row.vatMode, "dutch_vat");
});

test("a repeated key returns the same invoice and queues no second email", { skip }, async () => {
  const request = invoice();
  const first = await store.createInvoice(request);
  const again = await store.createInvoice({ ...request, issuedAt: new Date("2026-11-03T10:15:00.000Z") });
  assert.equal(again.created, false);
  assert.equal(again.invoice.id, first.invoice.id);
  assert.equal((await emailRows(first.invoice.id)).length, 1);
  assert.equal((await store.createInvoice(invoice())).invoice.number, "TEST-2026-0002");
});

test("parallel requests leave no gap, and one key used in parallel gives one invoice", { skip }, async () => {
  const same = invoice();
  const results = await Promise.all([
    ...Array.from({ length: 12 }, () => store.createInvoice(invoice())),
    ...Array.from({ length: 8 }, () => store.createInvoice(same)),
  ]);
  const numbers = [...new Set(results.map((result) => result.invoice.number))].sort();
  assert.deepEqual(
    numbers,
    Array.from({ length: 13 }, (_, index) => `TEST-2026-${String(index + 1).padStart(4, "0")}`),
  );
  assert.equal(results.filter((result) => result.invoice.idempotencyKey === same.idempotencyKey && result.created).length, 1);
});

test("a refused request consumes no number", { skip }, async () => {
  await assert.rejects(store.createInvoice(invoice({ buyer: { country: "US" } })));
  await assert.rejects(store.createInvoice(refund("inv_unknown", -100)));
  assert.equal((await store.createInvoice(invoice())).invoice.number, "TEST-2026-0001");
});

test("the number's year and VAT year follow Amsterdam time", { skip }, async () => {
  const { invoice: row } = await store.createInvoice(
    invoice({ issuedAt: new Date("2026-12-31T23:30:00.000Z"), payment: { status: "paid", provider: "mollie", reference: "tr_1", paidAt: "2026-12-31T22:30:00.000Z" } }),
  );
  assert.equal(row.number, "TEST-2027-0001");
  assert.equal(row.vatYear, 2026);
});

test("a credit note is negative, keeps the invoice's rate and mode, and refers to it", { skip }, async () => {
  const { invoice: original } = await store.createInvoice(invoice());
  const { invoice: full } = await store.createInvoice(refund(original.id, -3500));
  assert.deepEqual(store.invoiceResponse(full), {
    id: full.id,
    number: "TEST-2026-0002",
    vatRate: 21,
    amountExclVatCents: -2893,
    vatCents: -607,
    amountInclVatCents: -3500,
  });
  assert.equal(full.creditsNumber, original.number);
  assert.equal(full.vatMode, "dutch_vat");

  const partial = (await store.createInvoice(refund(original.id, -1000))).invoice;
  assert.equal(partial.amountExclVatCents + partial.vatCents, -1000);
});

test("a credit note cannot credit a credit note", { skip }, async () => {
  const { invoice: original } = await store.createInvoice(invoice());
  const { invoice: credit } = await store.createInvoice(refund(original.id, -100));
  await assert.rejects(store.createInvoice(refund(credit.id, -100)), { status: 422 });
});

test("no email address stores the invoice and queues nothing", { skip }, async () => {
  const { invoice: row } = await store.createInvoice(invoice({ buyer: { country: "DE" } }));
  assert.equal((await emailRows(row.id)).length, 0);
});

test("the threshold: warning at €8,000, the crossing sale uses OSS and warns once, TEST stays apart", { skip }, async () => {
  const alerts = () => db.select().from(schema.vatAlerts).where(eq(schema.vatAlerts.scope, "test"));
  const gross = (netCents: number) => Math.round(netCents * 1.21);

  await store.createInvoice(invoice({}, gross(790_000)));
  assert.equal((await alerts()).length, 0);

  await store.createInvoice(invoice({}, gross(20_000)));
  assert.deepEqual((await alerts()).map((alert) => alert.levelCents), [800_000]);

  // A Dutch buyer never moves the total.
  await store.createInvoice(invoice({ buyer: { country: "NL" } }, gross(500_000)));

  const below = (await store.createInvoice(invoice({}, gross(189_000)))).invoice;
  assert.equal(below.vatMode, "dutch_vat");

  const crossing = (await store.createInvoice(invoice({}, gross(2_000)))).invoice;
  assert.equal(crossing.vatMode, "oss");
  assert.equal(Number(crossing.vatRate), 19);
  assert.equal((await alerts()).filter((alert) => alert.levelCents === 1_000_000)[0].invoiceNumber, crossing.number);

  const next = (await store.createInvoice(invoice({ buyer: { country: "FI" } }))).invoice;
  assert.equal(Number(next.vatRate), 25.5);
  assert.equal(next.vatMode, "oss");
  assert.equal((await alerts()).length, 2);

  // A credit note after the switch keeps the rate of what it credits.
  const credit = (await store.createInvoice(refund(below.id, -1000))).invoice;
  assert.equal(Number(credit.vatRate), 21);
  assert.equal(credit.vatMode, "dutch_vat");

  const [liveTotal] = await db.execute<{ count: string }>(sql`select count(*) from vat_alerts where scope = 'live'`).then((result) => result.rows);
  assert.equal(liveTotal.count, "0");
});

test("the tick emails once with the PDF, escapes the name, retries a failure, and warns once", { skip }, async () => {
  process.env.DASHBOARD_SMTP_INFO_APP_PASSWORD = "unused";
  const { runInvoiceEmailTick } = await import("./delivery");
  const sent: { to: string; subject: string; html: string; attachments: { filename?: string; content: Buffer }[] }[] = [];
  let smtpDown = true;
  const transport = mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (mail: (typeof sent)[number]) => {
      if (smtpDown) throw Object.assign(new Error("rejected: user@example.com"), { responseCode: 550 });
      sent.push(mail);
    },
  }));
  const { invoice: row } = await store.createInvoice(invoice({ buyer: { name: "A <b>Buyer</b>", email: "user@example.com", country: "DE" } }, 1_000_000));

  // Down: nothing lost, the row waits for a later try.
  assert.deepEqual(await runInvoiceEmailTick(), { emails: 1, alerts: 0 });
  const [waiting] = await emailRows(row.id);
  assert.equal(waiting.status, "pending");
  assert.equal(waiting.attempts, 1);

  smtpDown = false;
  await db.update(schema.invoiceEmails).set({ nextTryAt: new Date(0) }).where(eq(schema.invoiceEmails.invoiceId, row.id));
  await runInvoiceEmailTick();
  assert.equal((await emailRows(row.id))[0].status, "sent");
  assert.equal(sent.length, 2); // The €8,000 warning and the invoice.
  const alert = sent[0];
  const mail = sent[1];
  assert.equal(alert.to, "a.arjmandi@arisoft.nl");
  assert.match(alert.subject, /^\[TEST\]/);
  assert.equal(mail.to, "user@example.com");
  assert.ok(!mail.html.includes("<b>Buyer</b>"));
  const pdf = mail.attachments.find((attachment) => attachment.filename === `${row.number}.pdf`);
  assert.equal(pdf?.content.subarray(0, 4).toString(), "%PDF");

  // A later tick sends nothing; only the Resend button sends again.
  await runInvoiceEmailTick();
  assert.equal(sent.length, 2);
  await store.queueInvoiceEmail(row.id);
  await runInvoiceEmailTick();
  assert.equal(sent.length, 3);
  transport.mock.restore();
});

test("the stored invoice renders to a PDF, credit notes too", { skip }, async () => {
  const { renderInvoicePdf } = await import("./renderInvoicePdf");
  const { invoice: row } = await store.createInvoice(invoice({ buyer: { name: "A <b>Buyer</b>", email: "user@example.com", country: "DE" } }));
  const { invoice: credit } = await store.createInvoice(refund(row.id, -3500));
  for (const stored of [row, credit]) {
    const pdf = await renderInvoicePdf(stored);
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  }
});
