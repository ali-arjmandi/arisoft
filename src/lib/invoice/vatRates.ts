import type { VatMode } from "./types";

const DUTCH = "NL";
export const OSS_THRESHOLD_CENTS = 1_000_000;
export const OSS_WARNING_CENTS = 800_000;

// Standard rates from Your Europe, last checked by the source on 13 July 2026:
// https://europa.eu/youreurope/business/finance-and-tax/vat/vat-rules-rates/index_en.htm
// A rate change is one new line with its start date; never edit an old line.
// Issued invoices keep their own copy of the rate. Countries are ISO codes, so
// Greece is GR, not the EL the source uses. A country missing here has no
// decided VAT, which is every non-EU country for now.
export const VAT_RATES: readonly { country: string; rate: number; from: string }[] = [
  { country: "AT", rate: 20, from: "2026-01-01" },
  { country: "BE", rate: 21, from: "2026-01-01" },
  { country: "BG", rate: 20, from: "2026-01-01" },
  { country: "CY", rate: 19, from: "2026-01-01" },
  { country: "CZ", rate: 21, from: "2026-01-01" },
  { country: "DE", rate: 19, from: "2026-01-01" },
  { country: "DK", rate: 25, from: "2026-01-01" },
  { country: "EE", rate: 24, from: "2026-01-01" },
  { country: "ES", rate: 21, from: "2026-01-01" },
  { country: "FI", rate: 25.5, from: "2026-01-01" },
  { country: "FR", rate: 20, from: "2026-01-01" },
  { country: "GR", rate: 24, from: "2026-01-01" },
  { country: "HR", rate: 25, from: "2026-01-01" },
  { country: "HU", rate: 27, from: "2026-01-01" },
  { country: "IE", rate: 23, from: "2026-01-01" },
  { country: "IT", rate: 22, from: "2026-01-01" },
  { country: "LT", rate: 21, from: "2026-01-01" },
  { country: "LU", rate: 17, from: "2026-01-01" },
  { country: "LV", rate: 21, from: "2026-01-01" },
  { country: "MT", rate: 18, from: "2026-01-01" },
  { country: "NL", rate: 21, from: "2026-01-01" },
  { country: "PL", rate: 23, from: "2026-01-01" },
  { country: "PT", rate: 23, from: "2026-01-01" },
  { country: "RO", rate: 21, from: "2026-01-01" },
  { country: "SE", rate: 25, from: "2026-01-01" },
  { country: "SI", rate: 22, from: "2026-01-01" },
  { country: "SK", rate: 23, from: "2026-01-01" },
];

// A 5xx on purpose: HSM keeps retrying, so the invoice issues once the VAT for
// that country is decided and added above.
export class VatUndecidedError extends Error {}

/** `date` is yyyy-mm-dd. */
export function vatRateFor(country: string, date: string): number | undefined {
  return VAT_RATES.filter((entry) => entry.country === country && entry.from <= date).sort((a, b) =>
    a.from.localeCompare(b.from),
  ).at(-1)?.rate;
}

/** The gross is fixed: VAT is what remains, so net + VAT always equals gross. */
export function splitGross(grossCents: number, rate: number): { netCents: number; vatCents: number } {
  const rateBasisPoints = Math.round(rate * 100);
  const absoluteNet = Math.round((Math.abs(grossCents) * 10_000) / (10_000 + rateBasisPoints));
  const netCents = grossCents < 0 ? -absoluteNet : absoluteNet;
  return { netCents, vatCents: grossCents - netCents };
}

function configuredMode(): VatMode {
  const mode = process.env.ARISOFT_VAT_MODE || "dutch_vat";
  if (mode !== "dutch_vat" && mode !== "oss") throw new Error("ARISOFT_VAT_MODE is not valid.");
  return mode;
}

export interface VatChoice {
  rate: number;
  mode: VatMode;
  euCrossBorder: boolean;
  // True on the first country-rate sale of a year that the setting did not ask for.
  switchedToOss: boolean;
}

export function chooseVat(input: {
  country: string;
  saleDate: string; // yyyy-mm-dd
  grossCents: number;
  soldThisYearCents: number;
  soldLastYearCents: number;
  ossUsedThisYear: boolean;
}): VatChoice {
  const countryRate = vatRateFor(input.country, input.saleDate);
  const dutchRate = vatRateFor(DUTCH, input.saleDate);
  if (countryRate === undefined || dutchRate === undefined) {
    throw new VatUndecidedError("No VAT rate is decided for this country and date.");
  }
  if (input.country === DUTCH) {
    return { rate: dutchRate, mode: "dutch_vat", euCrossBorder: false, switchedToOss: false };
  }

  const setting = configuredMode();
  const netAtDutchRate = splitGross(input.grossCents, dutchRate).netCents;
  const overThreshold =
    input.ossUsedThisYear ||
    input.soldLastYearCents > OSS_THRESHOLD_CENTS ||
    input.soldThisYearCents + netAtDutchRate > OSS_THRESHOLD_CENTS;

  if (setting === "oss" || overThreshold) {
    return {
      rate: countryRate,
      mode: "oss",
      euCrossBorder: true,
      switchedToOss: setting === "dutch_vat" && !input.ossUsedThisYear,
    };
  }
  return { rate: dutchRate, mode: "dutch_vat", euCrossBorder: true, switchedToOss: false };
}
