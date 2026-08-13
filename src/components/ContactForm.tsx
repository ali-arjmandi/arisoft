"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

declare global {
  interface Window {
    grecaptcha?: {
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
    };
  }
}

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const { t, locale } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const token = window.grecaptcha?.getResponse();
    if (!token) {
      setError(t.contact.recaptchaError);
      return;
    }

    setStatus("submitting");
    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch("https://submit-form.com/KgDtXVWBU", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          "g-recaptcha-response": token,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.contact.genericError);
      }

      setStatus("success");
      formRef.current?.reset();
      window.grecaptcha?.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t.contact.genericError);
      window.grecaptcha?.reset();
    }
  }

  return (
    <section id="contact" className="mx-auto max-w-2xl px-6 py-24">
      <Script src={`https://www.google.com/recaptcha/api.js?hl=${locale}`} strategy="afterInteractive" />

      <div className="text-center">
        <span className="text-base font-semibold uppercase text-gradient">{t.contact.eyebrow}</span>
        <p className="mt-3 text-3xl font-semibold sm:text-4xl">{t.contact.heading}</p>
        <p className="mt-3 text-body">{t.contact.description}</p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-10 space-y-5 rounded-2xl border border-border p-8 shadow-sm"
      >
        <div>
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            {t.contact.nameLabel}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder={t.contact.namePlaceholder}
            className="mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t.contact.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder={t.contact.emailPlaceholder}
            className="mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="message" className="text-sm font-medium text-foreground">
            {t.contact.messageLabel}
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            placeholder={t.contact.messagePlaceholder}
            className="mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary"
          />
        </div>

        <div
          className="g-recaptcha"
          data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
        />

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-full bg-blue-gradient border border-primary px-7 py-3.5 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 disabled:opacity-60"
        >
          {status === "submitting" ? t.contact.submitting : t.contact.submit}
        </button>

        {status === "success" && (
          <p className="text-center text-sm font-medium text-emerald-600">{t.contact.success}</p>
        )}
        {status === "error" && (
          <p className="text-center text-sm font-medium text-red-600">{error}</p>
        )}
      </form>
    </section>
  );
}
