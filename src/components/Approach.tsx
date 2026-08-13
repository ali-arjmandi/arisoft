"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Approach() {
  const { t } = useLanguage();

  return (
    <section id="approach" className="mx-auto max-w-screen-xl px-8 py-24">
      <div className="grid grid-cols-12 gap-x-6">
        <div className="col-span-12 lg:col-span-6">
          <ApproachIllustration />
        </div>

        <div className="col-span-12 mt-8 space-y-6 sm:space-y-8 lg:col-span-5 lg:col-start-8 lg:mt-0">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            {t.approach.headingPrefix} <span className="text-gradient">{t.approach.headingHighlight}</span>
            {t.approach.headingSuffix}
          </h2>
          <ul className="space-y-8 sm:space-y-6">
            {t.approach.points.map((point) => (
              <li key={point.title} className="space-y-2">
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 text-primary">
                    <path
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="font-medium text-foreground">{point.title}</span>
                </div>
                <p className="text-sm leading-relaxed text-body">{point.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ApproachIllustration() {
  return (
    <svg viewBox="0 0 480 400" className="w-full" fill="none" aria-hidden>
      <defs>
        <linearGradient id="approachPanel" x1="0" y1="0" x2="480" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EAF2FF" />
          <stop offset="100%" stopColor="#F3F8FF" />
        </linearGradient>
        <linearGradient id="approachShield" x1="150" y1="60" x2="330" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e68fe" />
          <stop offset="100%" stopColor="#0140bf" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="480" height="400" rx="32" fill="url(#approachPanel)" />
      <path
        d="M240 60l100 36v90c0 76-42 124-100 150-58-26-100-74-100-150V96l100-36z"
        fill="url(#approachShield)"
      />
      <path
        d="M195 205l30 30 60-60"
        stroke="#ffffff"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="90" cy="90" r="14" fill="#518afe" opacity="0.8" />
      <circle cx="400" cy="310" r="18" fill="#1e68fe" opacity="0.8" />
      <circle cx="410" cy="80" r="10" fill="#013297" opacity="0.7" />
    </svg>
  );
}
