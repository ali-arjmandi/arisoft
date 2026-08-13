"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Highlights() {
  const { t } = useLanguage();
  const highlights = t.highlights;

  return (
    <section className="mx-2 max-w-screen-xl rounded-[2.25rem] bg-white px-4 py-8 shadow-lg transform sm:mx-auto sm:rounded-xl sm:px-6 sm:py-8 sm:shadow-md lg:-translate-y-12 lg:px-0">
      <div className="flex w-full flex-col items-center justify-center lg:flex-row">
        {highlights.map((item, index) => (
          <div
            key={item.title}
            className={`mt-6 w-full space-y-3 overflow-hidden lg:mt-0 lg:w-1/3 lg:px-8 ${
              index < highlights.length - 1 ? "border-b border-border pb-6 lg:border-b-0 lg:border-r lg:pb-0" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{item.emoji}</span>
              <span className="font-medium text-foreground">{item.title}</span>
            </div>
            <p className="text-sm text-body leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
