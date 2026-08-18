"use client";

import { useEffect, useMemo, useState } from "react";
import { BTW_RATE_OPTIONS, type BtwRate } from "@/lib/invoice/btwRates";
import { calculateInvoiceTotals } from "@/lib/invoice/calculations";
import { formatCurrencyEUR } from "@/lib/invoice/format";
import { generateInvoicePdf } from "@/lib/invoice/generateInvoicePdf";
import type { InvoiceDocumentData } from "@/lib/invoice/types";

type Status = "idle" | "submitting" | "success" | "error";

type TextFieldName = "invoiceNumber" | "buyerName" | "buyerAddress" | "description";

interface FieldConfig {
  name: TextFieldName;
  label: string;
  type: "input" | "textarea";
  rows?: number;
}

const FIELDS: FieldConfig[] = [
  { name: "invoiceNumber", label: "Invoice number", type: "input" },
  { name: "buyerName", label: "Client name", type: "input" },
  { name: "buyerAddress", label: "Client address", type: "textarea", rows: 3 },
  { name: "description", label: "Description", type: "input" },
];

const fieldClassName =
  "mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted";

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeFilename(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]+/g, "-") || "invoice";
}

export function InvoiceForm() {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [amountIncludesBtw, setAmountIncludesBtw] = useState(false);
  const [btwRate, setBtwRate] = useState<BtwRate>(BTW_RATE_OPTIONS[0]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // Set on mount rather than as a useState lazy initializer — this is a
  // client component, but Next.js still server-renders it once on first
  // request, and "today" can legitimately differ between server and client
  // (different timezone/clock), which would otherwise cause a hydration
  // mismatch on this controlled input's value. Same pattern/tradeoff as
  // src/lib/i18n/LanguageContext.tsx's localStorage read.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvoiceDate(todayIso());
  }, []);

  const totals = useMemo(
    () => calculateInvoiceTotals(parseFloat(amountInput) || 0, btwRate, amountIncludesBtw),
    [amountInput, btwRate, amountIncludesBtw],
  );

  const values: Record<TextFieldName, string> = { invoiceNumber, buyerName, buyerAddress, description };
  const setters: Record<TextFieldName, (value: string) => void> = {
    invoiceNumber: setInvoiceNumber,
    buyerName: setBuyerName,
    buyerAddress: setBuyerAddress,
    description: setDescription,
  };

  function renderField(field: FieldConfig) {
    return (
      <div key={field.name}>
        <label htmlFor={field.name} className="text-sm font-medium text-foreground">
          {field.label}
        </label>
        {field.type === "textarea" ? (
          <textarea
            id={field.name}
            required
            rows={field.rows}
            value={values[field.name]}
            onChange={(event) => setters[field.name](event.target.value)}
            className={fieldClassName}
          />
        ) : (
          <input
            id={field.name}
            type="text"
            required
            value={values[field.name]}
            onChange={(event) => setters[field.name](event.target.value)}
            className={fieldClassName}
          />
        )}
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("submitting");

    const data: InvoiceDocumentData = {
      invoiceNumber,
      invoiceDate,
      deliveryDate: deliveryDate || null,
      buyerName,
      buyerAddressLines: buyerAddress
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      description,
      btwRate,
      totals,
    };

    try {
      const blob = await generateInvoicePdf(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${sanitizeFilename(invoiceNumber)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to generate PDF.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="invoiceDate" className="text-sm font-medium text-foreground">
            Invoice date
          </label>
          <input
            id="invoiceDate"
            type="date"
            required
            value={invoiceDate}
            onChange={(event) => setInvoiceDate(event.target.value)}
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor="deliveryDate" className="text-sm font-medium text-foreground">
            Delivery date <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="deliveryDate"
            type="date"
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
            className={fieldClassName}
          />
          <p className="mt-1 text-xs text-muted">Leave blank if same as the invoice date.</p>
        </div>
      </div>

      {FIELDS.map(renderField)}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="amountInput" className="text-sm font-medium text-foreground">
              Amount {amountIncludesBtw ? "incl. BTW" : "excl. BTW"}
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-body">
              <input
                type="checkbox"
                checked={amountIncludesBtw}
                onChange={(event) => setAmountIncludesBtw(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#AAAAAA] accent-primary"
              />
              BTW included
            </label>
          </div>
          <input
            id="amountInput"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="0.00"
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor="btwRate" className="text-sm font-medium text-foreground">
            BTW rate
          </label>
          <select
            id="btwRate"
            value={btwRate}
            onChange={(event) => setBtwRate(Number(event.target.value) as BtwRate)}
            className={fieldClassName}
          >
            {BTW_RATE_OPTIONS.map((rate) => (
              <option key={rate} value={rate}>
                {rate}%
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
        <div className="flex justify-between">
          <span className="text-body">Subtotal (excl. BTW)</span>
          <span className="text-foreground">{formatCurrencyEUR(totals.amountExclBtw)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-body">BTW ({btwRate}%)</span>
          <span className="text-foreground">{formatCurrencyEUR(totals.btwAmount)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
          <span className="text-foreground">Total (incl. BTW)</span>
          <span className="text-foreground">{formatCurrencyEUR(totals.amountInclBtw)}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-blue-gradient border border-primary px-7 py-3.5 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 disabled:opacity-60"
      >
        {status === "submitting" ? "Generating..." : "Download PDF"}
      </button>

      {status === "success" && <p className="text-center text-sm font-medium text-emerald-600">PDF downloaded.</p>}
      {status === "error" && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
