"use client";

import { useEffect, useMemo, useState } from "react";
import { BTW_RATE_OPTIONS, type BtwRate } from "@/lib/invoice/btwRates";
import { calculateInvoiceTotals } from "@/lib/invoice/calculations";
import { formatCurrencyEUR } from "@/lib/invoice/format";
import { generateInvoicePdf } from "@/lib/invoice/generateInvoicePdf";
import type { InvoiceDocumentData } from "@/lib/invoice/types";
import { ALLOWED_SENDERS, type AllowedSender } from "@/lib/email/senders";
import type { EmailContent } from "@/lib/email/content";

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

const AMOUNT_ROW_STYLE =
  "font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;padding-top:2px;";

function amountRow(label: string, value: string): string {
  // A real table, not tab characters — HTML collapses whitespace, so tabs
  // can't line anything up. The amount column auto-sizes to its widest
  // cell; left-aligning within it (rather than right-aligning) means every
  // figure starts at the same shared position regardless of label length,
  // instead of shorter numbers drifting inward to match a right edge.
  return `<tr>
    <td style="${AMOUNT_ROW_STYLE}color:#374151;padding-right:16px;">${label}</td>
    <td style="${AMOUNT_ROW_STYLE}color:#262626;text-align:left;white-space:nowrap;"><strong>${value}</strong></td>
  </tr>`;
}

function buildInvoiceEmailContent(data: InvoiceDocumentData): EmailContent {
  const { totals, btwRate } = data;

  const amountsTable = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;margin-bottom:8px;">${amountRow(
    "Subtotal (excl. BTW)",
    formatCurrencyEUR(totals.amountExclBtw),
  )}${amountRow(`BTW (${btwRate}%)`, formatCurrencyEUR(totals.btwAmount))}${amountRow(
    "Total (incl. BTW)",
    formatCurrencyEUR(totals.amountInclBtw),
  )}</table>`;

  const body =
    `${data.description}` +
    amountsTable +
    "Please find your invoice attached to this email. If you have any questions about the details or payment, just reply to this email or reach out anytime.";

  return {
    subject: `Your invoice from Arisoft: ${data.invoiceNumber}`,
    preheader: "Your invoice is ready, details and payment info inside.",
    eyebrow: "Invoice",
    heading: "Your invoice is attached",
    body,
    ctaLabel: "",
    ctaUrl: "",
    unsubscribeUrl: "",
  };
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
  const [sendByEmail, setSendByEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState<AllowedSender>(ALLOWED_SENDERS[0]);
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

    let blob: Blob;
    try {
      blob = await generateInvoicePdf(data);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to generate PDF.");
      return;
    }

    const filename = `invoice-${sanitizeFilename(invoiceNumber)}.pdf`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (!sendByEmail) {
      setStatus("success");
      return;
    }

    try {
      const emailFormData = new FormData();
      emailFormData.set("to", recipientEmail);
      emailFormData.set("from", senderEmail);
      emailFormData.set("content", JSON.stringify(buildInvoiceEmailContent(data)));
      emailFormData.append("files", new File([blob], filename, { type: "application/pdf" }));

      const res = await fetch("/api/dashboard/send-email", { method: "POST", body: emailFormData });
      if (!res.ok) {
        const resData = await res.json().catch(() => ({}));
        throw new Error(resData.error || "Failed to send email.");
      }
      setStatus("success");
    } catch (err) {
      // The PDF already downloaded successfully at this point — say so,
      // rather than reporting a blanket failure for a step that worked.
      setStatus("error");
      setError(
        `PDF downloaded, but sending the email failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
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

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={sendByEmail}
            onChange={(event) => setSendByEmail(event.target.checked)}
            className="h-4 w-4 rounded border-[#AAAAAA] accent-primary"
          />
          Also send by email
        </label>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="recipientEmail" className="text-xs font-medium text-muted">
              Recipient
            </label>
            <input
              id="recipientEmail"
              type="email"
              disabled={!sendByEmail}
              required={sendByEmail}
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="name@example.com"
              className={fieldClassName}
            />
          </div>
          <div>
            <label htmlFor="senderEmail" className="text-xs font-medium text-muted">
              Sender
            </label>
            <select
              id="senderEmail"
              disabled={!sendByEmail}
              value={senderEmail}
              onChange={(event) => setSenderEmail(event.target.value as AllowedSender)}
              className={fieldClassName}
            >
              {ALLOWED_SENDERS.map((sender) => (
                <option key={sender} value={sender}>
                  {sender}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-blue-gradient border border-primary px-7 py-3.5 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 disabled:opacity-60"
      >
        {status === "submitting"
          ? sendByEmail
            ? "Generating & sending..."
            : "Generating..."
          : sendByEmail
            ? "Download & Send Invoice"
            : "Download PDF"}
      </button>

      {status === "success" && (
        <p className="text-center text-sm font-medium text-emerald-600">
          {sendByEmail ? `PDF downloaded and sent to ${recipientEmail}.` : "PDF downloaded."}
        </p>
      )}
      {status === "error" && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
