"use client";

import { useState } from "react";
import Editor, { BtnBold, BtnItalic, BtnLink, Toolbar } from "react-simple-wysiwyg";
import { ALLOWED_SENDERS, type AllowedSender } from "@/lib/email/senders";
import { type ContentFieldName, type EmailContent } from "@/lib/email/content";

type Status = "idle" | "submitting" | "success" | "error";

interface FieldConfig {
  name: Exclude<ContentFieldName, "unsubscribeUrl" | "body">;
  label: string;
  type: "input" | "textarea";
  rows?: number;
}

const FIELDS: FieldConfig[] = [
  { name: "subject", label: "Subject", type: "input" },
  { name: "preheader", label: "Preheader (inbox preview text)", type: "textarea", rows: 2 },
  { name: "eyebrow", label: "Eyebrow", type: "input" },
  { name: "heading", label: "Heading", type: "textarea", rows: 2 },
];

const AFTER_BODY_FIELDS: FieldConfig[] = [
  { name: "ctaLabel", label: "CTA label", type: "input" },
  { name: "ctaUrl", label: "CTA URL", type: "input" },
];

const fieldClassName =
  "mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted";

export function EmailForm({ initialValues }: { initialValues: EmailContent }) {
  const [content, setContent] = useState<EmailContent>(initialValues);
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(false);
  const [to, setTo] = useState("");
  const [from, setFrom] = useState<AllowedSender>(ALLOWED_SENDERS[0]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  function updateField(name: ContentFieldName, value: string) {
    setContent((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("submitting");

    const payloadContent: EmailContent = {
      ...content,
      unsubscribeUrl: includeUnsubscribe ? content.unsubscribeUrl : "",
    };

    try {
      const res = await fetch("/api/panel/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, from, content: payloadContent }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send email.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send email.");
    }
  }

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
            value={content[field.name]}
            onChange={(event) => updateField(field.name, event.target.value)}
            className={fieldClassName}
          />
        ) : (
          <input
            id={field.name}
            type="text"
            required
            value={content[field.name]}
            onChange={(event) => updateField(field.name, event.target.value)}
            className={fieldClassName}
          />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      {FIELDS.map(renderField)}

      <div>
        <label htmlFor="body" className="text-sm font-medium text-foreground">
          Body
        </label>
        <div className="mt-2 overflow-hidden rounded-lg border border-[#AAAAAA] focus-within:border-primary">
          <Editor
            id="body"
            value={content.body}
            onChange={(event) => updateField("body", event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                document.execCommand("insertLineBreak");
              }
            }}
            containerProps={{ className: "text-sm" }}
          >
            <Toolbar>
              <BtnBold />
              <BtnItalic />
              <BtnLink />
            </Toolbar>
          </Editor>
        </div>
      </div>

      {AFTER_BODY_FIELDS.map(renderField)}

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={includeUnsubscribe}
            onChange={(event) => setIncludeUnsubscribe(event.target.checked)}
            className="h-4 w-4 rounded border-[#AAAAAA] accent-primary"
          />
          Include unsubscribe link
        </label>
        <input
          id="unsubscribeUrl"
          type="text"
          disabled={!includeUnsubscribe}
          required={includeUnsubscribe}
          value={content.unsubscribeUrl}
          onChange={(event) => updateField("unsubscribeUrl", event.target.value)}
          className={fieldClassName}
        />
      </div>

      <hr className="border-border" />

      <div>
        <label htmlFor="to" className="text-sm font-medium text-foreground">
          Recipient
        </label>
        <input
          id="to"
          type="email"
          required
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="name@example.com"
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor="from" className="text-sm font-medium text-foreground">
          Sender
        </label>
        <select
          id="from"
          value={from}
          onChange={(event) => setFrom(event.target.value as AllowedSender)}
          className={fieldClassName}
        >
          {ALLOWED_SENDERS.map((sender) => (
            <option key={sender} value={sender}>
              {sender}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-blue-gradient border border-primary px-7 py-3.5 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 disabled:opacity-60"
      >
        {status === "submitting" ? "Sending..." : "Send email"}
      </button>

      {status === "success" && (
        <p className="text-center text-sm font-medium text-emerald-600">Email sent to {to}.</p>
      )}
      {status === "error" && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
