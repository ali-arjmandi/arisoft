import assert from "node:assert/strict";
import { test } from "node:test";
import { invoiceSignature, isSignedRequest } from "./api";
import { parseInvoiceRequest } from "./request";
import { chooseVat, OSS_THRESHOLD_CENTS, splitGross, vatRateFor, VatUndecidedError } from "./vatRates";

const SECRET = "test-secret";
const URL_BASE = "https://arisoft.nl/api/invoices";

function signedRequest(body: string, { secondsOld = 0, signature }: { secondsOld?: number; signature?: string } = {}) {
  const timestamp = String(Math.floor(Date.now() / 1000) - secondsOld);
  return new Request(URL_BASE, {
    method: "POST",
    body,
    headers: {
      "x-arisoft-timestamp": timestamp,
      "x-arisoft-signature": signature ?? invoiceSignature(SECRET, timestamp, "POST", "/api/invoices", body),
    },
  });
}

test("the signature matches vectors computed with HSM's invoiceSignature formula", () => {
  assert.equal(
    invoiceSignature(SECRET, "1793000000", "POST", "/api/invoices", '{"a":1}'),
    "ebcafcd8495f9be5940f24cee7204b10995484a1e1cadf94e655867c83f870d5",
  );
  assert.equal(
    invoiceSignature(SECRET, "1793000000", "GET", "/api/invoices/inv_x/pdf", ""),
    "3c07b029138146121e6d63a887b808a50ef31ebb8ef6ac8d1de29c1b4487e10e",
  );
});

test("a signed request passes", () => {
  assert.equal(isSignedRequest(signedRequest("{}"), "{}", SECRET), true);
});

test("a query string is not part of the signed path", () => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const request = new Request(`${URL_BASE}?a=1`, {
    method: "POST",
    headers: {
      "x-arisoft-timestamp": timestamp,
      "x-arisoft-signature": invoiceSignature(SECRET, timestamp, "POST", "/api/invoices", ""),
    },
  });
  assert.equal(isSignedRequest(request, "", SECRET), true);
});

test("an old, a far-future, a wrong or a malformed signature is refused", () => {
  assert.equal(isSignedRequest(signedRequest("{}", { secondsOld: 301 }), "{}", SECRET), false);
  assert.equal(isSignedRequest(signedRequest("{}", { secondsOld: -301 }), "{}", SECRET), false);
  assert.equal(isSignedRequest(signedRequest("{}", { signature: "0".repeat(64) }), "{}", SECRET), false);
  assert.equal(isSignedRequest(signedRequest("{}", { signature: "abc" }), "{}", SECRET), false);
  assert.equal(isSignedRequest(signedRequest("{}"), '{"changed":1}', SECRET), false);
});

test("net + VAT equals gross for every cent amount at every rate, also negative", () => {
  const rates = [0, 17, 19, 21, 25.5, 27];
  for (const rate of rates) {
    for (let gross = 1; gross <= 20_000; gross += 7) {
      const positive = splitGross(gross, rate);
      const negative = splitGross(-gross, rate);
      assert.equal(positive.netCents + positive.vatCents, gross);
      assert.equal(negative.netCents + negative.vatCents, -gross);
      assert.equal(negative.netCents, -positive.netCents); // A full refund mirrors the invoice.
    }
  }
});

test("the contract's example splits as documented", () => {
  assert.deepEqual(splitGross(3500, 19), { netCents: 2941, vatCents: 559 });
  assert.deepEqual(splitGross(-3500, 19), { netCents: -2941, vatCents: -559 });
});

test("a rate is chosen by its start date", () => {
  assert.equal(vatRateFor("FI", "2026-11-02"), 25.5);
  assert.equal(vatRateFor("GR", "2026-11-02"), 24);
  assert.equal(vatRateFor("EL", "2026-11-02"), undefined);
  assert.equal(vatRateFor("DE", "2025-12-31"), undefined);
});

const sale = { saleDate: "2026-11-02", grossCents: 3500, soldThisYearCents: 0, soldLastYearCents: 0, ossUsedThisYear: false };

test("an EU buyer pays Dutch VAT and counts toward the threshold; a Dutch buyer does not count", () => {
  assert.deepEqual(chooseVat({ ...sale, country: "DE" }), { rate: 21, mode: "dutch_vat", euCrossBorder: true, switchedToOss: false });
  assert.deepEqual(chooseVat({ ...sale, country: "NL" }), { rate: 21, mode: "dutch_vat", euCrossBorder: false, switchedToOss: false });
});

test("a non-EU buyer stays undecided", () => {
  assert.throws(() => chooseVat({ ...sale, country: "US" }), VatUndecidedError);
  assert.throws(() => chooseVat({ ...sale, country: "GB" }), VatUndecidedError);
});

test("the sale that crosses €10,000 takes the country rate; exactly €10,000 does not", () => {
  const net = splitGross(sale.grossCents, 21).netCents;
  const exactly = chooseVat({ ...sale, country: "DE", soldThisYearCents: OSS_THRESHOLD_CENTS - net });
  assert.equal(exactly.mode, "dutch_vat");
  const crossing = chooseVat({ ...sale, country: "DE", soldThisYearCents: OSS_THRESHOLD_CENTS - net + 1 });
  assert.deepEqual(crossing, { rate: 19, mode: "oss", euCrossBorder: true, switchedToOss: true });
});

test("the country rate stays for the rest of the year and all of the next, without a new warning", () => {
  const later = chooseVat({ ...sale, country: "FI", ossUsedThisYear: true });
  assert.deepEqual(later, { rate: 25.5, mode: "oss", euCrossBorder: true, switchedToOss: false });
  const nextYear = chooseVat({ ...sale, country: "DE", soldLastYearCents: OSS_THRESHOLD_CENTS + 1 });
  assert.equal(nextYear.mode, "oss");
});

test("the oss setting forces the country rate, without calling it a switch", () => {
  process.env.ARISOFT_VAT_MODE = "oss";
  try {
    assert.deepEqual(chooseVat({ ...sale, country: "DE" }), { rate: 19, mode: "oss", euCrossBorder: true, switchedToOss: false });
    assert.equal(chooseVat({ ...sale, country: "NL" }).mode, "dutch_vat");
  } finally {
    delete process.env.ARISOFT_VAT_MODE;
  }
});

const hsmBody = {
  series: "HSM",
  idempotencyKey: "mollie:tr_1",
  kind: "invoice",
  issuedAt: "2026-11-02T10:15:00.000Z",
  sendEmail: true,
  buyer: { email: "user@example.com", country: "DE" },
  lines: [{ description: "Pass", quantity: 1, amountInclVatCents: 3500 }],
  payment: { status: "paid", provider: "mollie", reference: "tr_1", paidAt: "2026-11-02T10:14:51.000Z" },
};

test("HSM's body parses, also without name, email or payment.method", () => {
  assert.equal(parseInvoiceRequest(hsmBody).buyer.country, "DE");
  assert.equal(parseInvoiceRequest({ ...hsmBody, buyer: { country: "DE" } }).buyer.email, undefined);
});

test("bad data is refused: series, country, sign and credit note fields", () => {
  const refused = (body: unknown) => assert.throws(() => parseInvoiceRequest(body), { status: 422 });
  refused({ ...hsmBody, series: "OTHER" });
  refused({ ...hsmBody, buyer: { country: "de" } });
  refused({ ...hsmBody, buyer: { country: "Q1" } });
  refused({ ...hsmBody, lines: [] });
  refused({ ...hsmBody, lines: [{ description: "Pass", quantity: 1, amountInclVatCents: -3500 }] });
  refused({ ...hsmBody, kind: "credit_note", payment: { ...hsmBody.payment, status: "refunded" } });
  refused({ ...hsmBody, kind: "credit_note", creditsInvoiceId: "inv_x" });
});
