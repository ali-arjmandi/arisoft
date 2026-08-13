"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

const STEP_ICONS = [
  <path key="0" d="M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />,
  <path key="1" d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8z" />,
  <path key="2" d="M11 2a9 9 0 100 18 9 9 0 000-18zM21 21l-4.35-4.35" />,
  <path key="3" d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
];

export function Process() {
  const { t } = useLanguage();
  const steps = t.process.steps;

  return (
    <section
      id="how-we-work"
      className="relative mx-4 my-24 max-w-full overflow-hidden rounded-2xl bg-[#F3F8FF] py-16 shadow sm:mx-4 xl:mx-10"
    >
      <div className="mx-auto flex w-full flex-col items-center px-4">
        <span className="text-base font-semibold uppercase text-gradient">{t.process.eyebrow}</span>
        <h2 className="mt-3 text-center text-3xl font-semibold sm:text-4xl">{t.process.heading}</h2>

        <div className="relative mt-16 flex w-full flex-col items-start justify-between gap-y-12 lg:flex-row lg:gap-x-6">
          {steps.map((step, index) => (
            <div key={step.title} className="relative w-full max-w-[280px] mx-auto space-y-4 text-center xl:max-w-[300px]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-gradient shadow-md shadow-primary/30">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {STEP_ICONS[index]}
                </svg>
              </div>
              <span className="text-sm font-semibold text-gradient">0{index + 1}</span>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-body">{step.description}</p>

              {index < steps.length - 1 && (
                <svg
                  className="pointer-events-none absolute top-8 -right-3 hidden w-6 text-primary-light lg:block xl:-right-4 xl:w-8"
                  viewBox="0 0 32 8"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M0 4h28m0 0l-6-4m6 4l-6 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
