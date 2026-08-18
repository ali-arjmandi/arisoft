import type { BtwRate } from "./btwRates";
import type { InvoiceTotals } from "./types";

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * `amount` is interpreted as either the excl.-BTW or incl.-BTW figure
 * depending on `amountIncludesBtw` (the form's toggle). Either way, one side
 * is rounded first and the other two values are derived from it — rounding
 * excl. and BTW independently and summing them can land a cent off from a
 * rounded incl. total.
 */
export function calculateInvoiceTotals(
  amount: number,
  btwRate: BtwRate,
  amountIncludesBtw: boolean,
): InvoiceTotals {
  if (amountIncludesBtw) {
    const incl = roundCurrency(amount);
    const excl = roundCurrency(incl / (1 + btwRate / 100));
    const btwAmount = roundCurrency(incl - excl);
    return { amountExclBtw: excl, btwAmount, amountInclBtw: incl };
  }

  const excl = roundCurrency(amount);
  const btwAmount = roundCurrency(excl * (btwRate / 100));
  const incl = roundCurrency(excl + btwAmount);
  return { amountExclBtw: excl, btwAmount, amountInclBtw: incl };
}

/**
 * `invoiceDateIso` is a "yyyy-mm-dd" string from <input type="date">. Parsed
 * and added to in UTC deliberately — treating it as a local date and using
 * local Date methods can shift the day backward in negative-UTC-offset
 * timezones.
 */
export function calculateDueDate(invoiceDateIso: string, paymentTermDays: number): Date | null {
  if (!invoiceDateIso) return null;
  const [year, month, day] = invoiceDateIso.split("-").map(Number);
  if (!year || !month || !day) return null;

  const due = new Date(Date.UTC(year, month - 1, day));
  due.setUTCDate(due.getUTCDate() + paymentTermDays);
  return due;
}
