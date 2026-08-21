"use client";

import { Logo } from "./Logo";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SELLER } from "@/lib/invoice/seller";

export function Footer() {
  const { t } = useLanguage();

  const navLinks = [
    { label: t.nav.howWeWork, href: "#how-we-work" },
    { label: t.nav.services, href: "#services" },
    { label: t.nav.approach, href: "#approach" },
    { label: t.nav.faq, href: "#faq" },
  ];

  return (
    <footer className="mx-auto max-w-screen-xl px-8">
      <div className="w-full border-y border-border">
        <div className="grid sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
          <div className="flex w-full flex-col gap-6 border-border py-6 sm:py-12 xl:border-r xl:pr-10">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-body">{t.footer.description}</p>
          </div>

          <div className="w-full border-t border-border py-6 sm:border-t-0 sm:py-12 sm:px-16 xl:border-r xl:border-t-0">
            <ul className="space-y-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-muted transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full space-y-4 border-t border-border py-6 sm:col-span-2 sm:py-12 sm:px-16 xl:col-span-1 xl:border-t-0 xl:px-10">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#F3F8FF] px-3 py-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {t.footer.location}
            </span>
            <div className="space-y-2">
              <a
                href="mailto:info@arisoft.nl"
                className="block text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                info@arisoft.nl
              </a>
              <a
                href="tel:+31657989972"
                className="block text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                +31 6 57989972
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 py-4 sm:py-8">
        <div className="text-center text-sm text-muted">
          © {new Date().getFullYear()} {t.footer.copyright}
        </div>
        <div className="flex flex-col items-center gap-1 text-center text-xs text-muted">
          <span>
            {t.footer.kvkLabel}: {SELLER.kvkNumber}
          </span>
          <span>
            {t.footer.btwLabel}: {SELLER.btwNumber}
          </span>
        </div>
      </div>

      <div className="my-10 flex w-full justify-center">
        <a
          href="#top"
          className="flex items-center gap-2 rounded-md border border-border bg-surface-muted px-6 py-3 text-body transition hover:bg-[#F3F3F3] hover:shadow-md"
        >
          <span>{t.footer.backToTop}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
