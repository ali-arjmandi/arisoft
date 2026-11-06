import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { renderInvoicePdf } from "./renderInvoicePdf";
import { SELLER } from "./seller";
import type { InvoiceRow } from "./store";

// Reads the PDF the way a person's viewer does, so it needs poppler's
// pdftotext and pdffonts (brew install poppler). Missing tools fail the test.
const folder = mkdtempSync(path.join(tmpdir(), "invoice-pdf-"));
after(() => rmSync(folder, { recursive: true, force: true }));

const row = (name: string, description = "Pass"): InvoiceRow => ({
  id: "inv_test",
  series: "TEST",
  number: "TEST-2026-0001",
  kind: "invoice",
  idempotencyKey: "test",
  creditsInvoiceId: null,
  creditsNumber: null,
  issuedAt: new Date("2026-11-02T10:15:00.000Z"),
  vatYear: 2026,
  vatRate: "21.00",
  vatMode: "dutch_vat",
  euCrossBorder: true,
  amountExclVatCents: 2893,
  vatCents: 607,
  amountInclVatCents: 3500,
  buyer: { name, email: "user@example.com", country: "BG" },
  seller: SELLER,
  lines: [{ description, quantity: 1, amountInclVatCents: 3500, amountExclVatCents: 2893, vatCents: 607 }],
  payment: { status: "paid", provider: "mollie", reference: "tr_1", paidAt: "2026-11-02T10:14:51.000Z" },
  createdAt: new Date("2026-11-02T10:15:00.000Z"),
});

async function readPdf(invoice: InvoiceRow) {
  const file = path.join(folder, "invoice.pdf");
  writeFileSync(file, await renderInvoicePdf(invoice));
  return {
    text: execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" }),
    fonts: execFileSync("pdffonts", [file], { encoding: "utf8" }),
  };
}

test("extended Latin, Cyrillic and Greek print as themselves, in name and line", async () => {
  const name = "Ayşe Şahin Łukasz Ирина Γιώργος";
  const { text, fonts } = await readPdf(row(name, "Подписка Ирина"));
  assert.ok(text.includes(name), text);
  assert.ok(text.includes("Ирина"), text);
  assert.ok(text.includes("Подписка"), text);
  assert.ok(!text.includes("@8=0"), text);
  assert.ok(!/Helvetica/i.test(fonts), fonts);
  assert.match(fonts, /NotoSans/);
  assert.match(fonts, /Poppins/);
});

test("a decomposed name still prints: combining marks are composed first", async () => {
  const { text } = await readPdf(row("Şahin"));
  assert.ok(text.includes("Şahin"), text);
});

test("a name the font cannot print shows question marks, never other letters", async () => {
  const { text, fonts } = await readPdf(row("Ирина مریم 李"));
  assert.ok(text.includes("Ирина ???? ?"), text);
  assert.ok(!/Helvetica/i.test(fonts), fonts);
});
