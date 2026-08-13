"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section id="top" className="relative w-full overflow-hidden pb-16">
      <div className="relative mx-auto grid max-w-screen-xl grid-cols-12 gap-x-6 px-6 lg:px-8">
        <div className="col-span-12 mt-12 space-y-5 text-center sm:space-y-6 lg:col-span-6 lg:mt-16 lg:text-left">
          <span className="text-base font-semibold uppercase text-gradient">
            {t.hero.eyebrow}
          </span>
          <h1 className="text-[2.5rem] font-bold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
            {t.hero.headlinePrefix}{" "}
            <span className="text-gradient">{t.hero.headlineHighlight}</span>
          </h1>
          <p className="mx-auto max-w-xl text-body leading-relaxed tracking-wide lg:mx-0">
            {t.hero.subtext}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row lg:justify-start">
            <a
              href="#contact"
              className="w-full max-w-full rounded-full bg-blue-gradient border border-primary px-8 py-4 text-center text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 sm:w-auto"
            >
              {t.hero.ctaPrimary}
            </a>
            <a
              href="#how-we-work"
              className="w-full max-w-full rounded-full border border-primary px-8 py-4 text-center text-sm text-gradient font-medium transition duration-300 hover:shadow-md hover:shadow-primary/30 sm:w-auto"
            >
              {t.hero.ctaSecondary}
            </a>
          </div>
        </div>

        <div className="relative col-span-12 mt-12 hidden items-center justify-center sm:flex lg:col-span-6 lg:mt-0">
          <HeroIllustration />
        </div>

        <span className="pointer-events-none absolute bottom-12 left-4 hidden h-2 w-2 rounded-full bg-primary-light sm:block xl:left-0" />
        <span className="pointer-events-none absolute top-10 right-72 hidden h-2 w-2 rounded-full bg-primary sm:block xl:right-[28rem]" />
        <span className="pointer-events-none absolute bottom-56 right-16 hidden h-1.5 w-1.5 rounded-full bg-primary-light sm:block" />
      </div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 420 420"
      className="w-full max-w-md"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="heroSphere" x1="60" y1="60" x2="360" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e68fe" />
          <stop offset="100%" stopColor="#0140bf" />
        </linearGradient>
        <linearGradient id="heroRing" x1="0" y1="0" x2="420" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#518afe" />
          <stop offset="100%" stopColor="#013297" />
        </linearGradient>
      </defs>

      <circle cx="210" cy="210" r="150" fill="url(#heroSphere)" opacity="0.12" />
      <circle cx="210" cy="210" r="105" fill="url(#heroSphere)" />
      <ellipse
        cx="210"
        cy="210"
        rx="150"
        ry="60"
        stroke="url(#heroRing)"
        strokeWidth="3"
        transform="rotate(-20 210 210)"
      />
      <ellipse
        cx="210"
        cy="210"
        rx="150"
        ry="60"
        stroke="url(#heroRing)"
        strokeWidth="3"
        opacity="0.5"
        transform="rotate(35 210 210)"
      />

      <path
        d="M225 155L180 220h35l-8 55 55-65h-35l8-55z"
        fill="#ffffff"
      />

      <circle cx="80" cy="120" r="20" fill="#ffffff" />
      <circle cx="80" cy="120" r="20" fill="url(#heroSphere)" opacity="0.15" />
      <circle cx="345" cy="150" r="16" fill="#518afe" opacity="0.85" />
      <circle cx="330" cy="300" r="22" fill="#1e68fe" opacity="0.9" />
      <circle cx="70" cy="300" r="14" fill="#013297" opacity="0.8" />
    </svg>
  );
}
