"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function FAQ() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-screen-xl px-6 py-24 lg:px-8">
      <div className="grid grid-cols-12 gap-x-6">
        <div className="col-span-12 lg:col-span-6">
          <FAQIllustration />
        </div>

        <div className="col-span-12 mt-8 px-0 lg:col-span-6 lg:mt-0 lg:px-6">
          <span className="mb-4 block text-base font-semibold uppercase text-gradient sm:mb-2">
            {t.faq.eyebrow}
          </span>
          <h2 className="mb-10 text-3xl font-semibold sm:mb-6 sm:text-4xl">{t.faq.heading}</h2>

          <ul className="shadow-box">
            {t.faq.items.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <li key={faq.question} className="relative border-b-2 border-border">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="w-full py-4 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{faq.question}</span>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0140bf"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </button>
                  <div
                    className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] pb-4 opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0">
                      <p className="text-sm leading-relaxed tracking-wide text-body">{faq.answer}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FAQIllustration() {
  return (
    <svg viewBox="0 0 480 400" className="w-full" fill="none" aria-hidden>
      <defs>
        <linearGradient id="faqPanel" x1="0" y1="0" x2="480" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F3F8FF" />
          <stop offset="100%" stopColor="#EAF2FF" />
        </linearGradient>
        <linearGradient id="faqBubble" x1="120" y1="80" x2="360" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e68fe" />
          <stop offset="100%" stopColor="#0140bf" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="480" height="400" rx="32" fill="url(#faqPanel)" />
      <rect x="110" y="90" width="260" height="150" rx="24" fill="url(#faqBubble)" />
      <path d="M180 240l-20 40 50-40h-30z" fill="url(#faqBubble)" />
      <circle cx="160" cy="140" r="8" fill="#ffffff" />
      <circle cx="200" cy="140" r="8" fill="#ffffff" />
      <circle cx="240" cy="140" r="8" fill="#ffffff" />
      <rect x="150" y="175" width="180" height="10" rx="5" fill="#ffffff" opacity="0.6" />
      <rect x="150" y="195" width="120" height="10" rx="5" fill="#ffffff" opacity="0.6" />
      <circle cx="380" cy="300" r="20" fill="#518afe" opacity="0.85" />
      <circle cx="90" cy="290" r="14" fill="#013297" opacity="0.8" />
    </svg>
  );
}
