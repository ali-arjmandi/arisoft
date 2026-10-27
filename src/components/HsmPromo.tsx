"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

const HSM_URL = "https://hsm.arisoft.nl";

export function HsmPromo() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-screen-xl px-6 pb-24 lg:px-8">
      <div className="flex flex-col items-center gap-8 rounded-2xl border border-border bg-white px-6 py-10 text-center shadow-md sm:px-10 lg:flex-row lg:text-left">
        <div className="flex-1 space-y-3">
          <span className="text-sm font-semibold uppercase text-gradient">{t.hsmPromo.badge}</span>
          <h3 className="text-2xl font-semibold text-foreground">{t.hsmPromo.heading}</h3>
          <p className="max-w-xl text-body leading-relaxed">{t.hsmPromo.description}</p>
        </div>

        <div className="flex gap-8">
          {t.hsmPromo.stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-gradient">{stat.value}</div>
              <div className="text-sm text-body">{stat.label}</div>
            </div>
          ))}
        </div>

        <a
          href={HSM_URL}
          target="_blank"
          rel="noopener"
          className="w-full rounded-full bg-blue-gradient border border-primary px-8 py-4 text-center text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 sm:w-auto"
        >
          {t.hsmPromo.cta} →
        </a>
      </div>
    </section>
  );
}
