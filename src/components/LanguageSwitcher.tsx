"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-full border border-border p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-3 py-1.5 transition-colors ${
          locale === "en" ? "bg-blue-gradient text-white" : "text-muted hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("nl")}
        aria-pressed={locale === "nl"}
        className={`rounded-full px-3 py-1.5 transition-colors ${
          locale === "nl" ? "bg-blue-gradient text-white" : "text-muted hover:text-foreground"
        }`}
      >
        NL
      </button>
    </div>
  );
}
