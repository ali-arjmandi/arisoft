"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Header() {
  const { t } = useLanguage();

  const navLinks = [
    { label: t.nav.howWeWork, href: "#how-we-work" },
    { label: t.nav.services, href: "#services" },
    { label: t.nav.approach, href: "#approach" },
    { label: t.nav.faq, href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-5 lg:px-8">
        <Link href="#top" aria-label="Arisoft home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-2 lg:flex xl:gap-4">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <a
            href="mailto:info@arisoft.nl"
            className="rounded-full border border-primary px-8 py-3 text-sm text-center text-gradient font-medium transition duration-300 hover:shadow-md hover:shadow-primary/30"
          >
            info@arisoft.nl
          </a>
          <a
            href="#contact"
            className="rounded-full bg-blue-gradient border border-primary px-8 py-3 text-sm text-center font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50"
          >
            {t.nav.getInTouch}
          </a>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <LanguageSwitcher />
          <a
            href="#contact"
            className="rounded-full bg-blue-gradient px-6 py-2.5 text-sm font-medium text-white"
          >
            {t.nav.getInTouch}
          </a>
        </div>
      </nav>
    </header>
  );
}
