export function formatCurrencyEUR(value: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Accepts either a Date or a "yyyy-mm-dd" string (parsed in UTC — see the
 * note in calculations.ts). "en-GB" gives an unambiguous "17 Aug 2026" style
 * output, avoiding day/month order confusion.
 */
export function formatInvoiceDate(input: string | Date | null | undefined): string {
  if (!input) return "";

  if (input instanceof Date) {
    return DATE_FORMATTER.format(input);
  }

  const [year, month, day] = input.split("-").map(Number);
  if (!year || !month || !day) return "";
  return DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)));
}
