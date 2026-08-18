"use client";

import { useRef, useState } from "react";
import Editor, { BtnBold, BtnItalic, BtnLink, Toolbar } from "react-simple-wysiwyg";
import { ALLOWED_SENDERS, type AllowedSender } from "@/lib/email/senders";
import { type ContentFieldName, type EmailContent } from "@/lib/email/content";
import { validateAttachments, MAX_ATTACHMENTS_TOTAL_BYTES } from "@/lib/email/attachments";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Status = "idle" | "submitting" | "success" | "error";

interface FieldConfig {
  name: Exclude<ContentFieldName, "unsubscribeUrl" | "body" | "ctaLabel" | "ctaUrl">;
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

const fieldClassName =
  "mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted";

export function EmailForm({ initialValues }: { initialValues: EmailContent }) {
  const [content, setContent] = useState<EmailContent>(initialValues);
  const [includeCta, setIncludeCta] = useState(true);
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [to, setTo] = useState("");
  const [from, setFrom] = useState<AllowedSender>(ALLOWED_SENDERS[0]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField(name: ContentFieldName, value: string) {
    setContent((prev) => ({ ...prev, [name]: value }));
  }

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const attachmentErrors = validateAttachments(files);
    if (attachmentErrors.length > 0) {
      setStatus("error");
      setError(attachmentErrors.join(" "));
      return;
    }

    setStatus("submitting");

    const payloadContent: EmailContent = {
      ...content,
      ctaLabel: includeCta ? content.ctaLabel : "",
      ctaUrl: includeCta ? content.ctaUrl : "",
      unsubscribeUrl: includeUnsubscribe ? content.unsubscribeUrl : "",
    };

    const formData = new FormData();
    formData.set("to", to);
    formData.set("from", from);
    formData.set("content", JSON.stringify(payloadContent));
    for (const file of files) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/panel/send-email", {
        method: "POST",
        body: formData,
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

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={includeCta}
            onChange={(event) => setIncludeCta(event.target.checked)}
            className="h-4 w-4 rounded border-[#AAAAAA] accent-primary"
          />
          Include CTA button
        </label>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="ctaLabel" className="text-xs font-medium text-muted">
              CTA label
            </label>
            <input
              id="ctaLabel"
              type="text"
              disabled={!includeCta}
              required={includeCta}
              value={content.ctaLabel}
              onChange={(event) => updateField("ctaLabel", event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div>
            <label htmlFor="ctaUrl" className="text-xs font-medium text-muted">
              CTA URL
            </label>
            <input
              id="ctaUrl"
              type="text"
              disabled={!includeCta}
              required={includeCta}
              value={content.ctaUrl}
              onChange={(event) => updateField("ctaUrl", event.target.value)}
              className={fieldClassName}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="attachments" className="text-sm font-medium text-foreground">
          Attachments
        </label>
        <input
          ref={fileInputRef}
          id="attachments"
          type="file"
          multiple
          onChange={(event) => addFiles(event.target.files)}
          className="mt-2 block w-full text-sm text-body file:mr-4 file:rounded-full file:border file:border-primary file:bg-transparent file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-surface-muted"
        />
        <p className="mt-1 text-xs text-muted">
          Up to 25MB total. Files Gmail blocks (.exe, .zip-wrapped executables, etc.) will be rejected.
        </p>

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.lastModified}-${index}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="truncate text-foreground">{file.name}</span>
                <span className="ml-3 flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
            <li className="text-xs text-muted">
              Total: {formatBytes(files.reduce((sum, file) => sum + file.size, 0))} /{" "}
              {formatBytes(MAX_ATTACHMENTS_TOTAL_BYTES)}
            </li>
          </ul>
        )}
      </div>

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
