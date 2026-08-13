"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

const SERVICE_ICONS = [
  <path key="0" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4V6z" />,
  <path key="1" d="M12 3l3 6 6 1-4.5 4.5L17.5 21 12 17.5 6.5 21l1-6.5L3 10l6-1 3-6z" />,
  <path
    key="2"
    d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
  />,
  <path key="3" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" />,
];

export function Services() {
  const { t } = useLanguage();

  return (
    <section id="services" className="mx-auto max-w-screen-xl px-6 py-4 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-base font-semibold uppercase text-gradient">{t.services.eyebrow}</span>
        <p className="mt-3 text-3xl font-semibold sm:text-4xl">{t.services.heading}</p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {t.services.items.map((service, index) => (
          <div
            key={service.title}
            className="rounded-2xl border border-border p-6 transition duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2FF]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0140bf"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {SERVICE_ICONS[index]}
              </svg>
            </span>
            <h3 className="mt-5 font-semibold text-foreground">{service.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">{service.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
