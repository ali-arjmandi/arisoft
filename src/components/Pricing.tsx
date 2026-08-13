"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Pricing() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-screen-xl px-6 py-4 lg:px-8">
      <div className="overflow-hidden rounded-2xl bg-blue-gradient px-8 py-16 text-center sm:px-16">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white">
          {t.pricing.badge}
        </span>
        <p className="mx-auto mt-6 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          {t.pricing.heading}
        </p>
        <p className="mx-auto mt-4 max-w-xl text-white/85">{t.pricing.description}</p>
        <a
          href="#contact"
          className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-sm font-medium text-primary transition duration-300 hover:shadow-lg"
        >
          {t.pricing.cta}
        </a>
      </div>
    </section>
  );
}
