"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/panel/email", label: "Email" },
  { href: "/panel/invoice", label: "Invoice" },
  { href: "/panel/company-analyzer", label: "Company analyzer" },
];

export function PanelNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-2">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-full border border-primary bg-blue-gradient px-4 py-2 text-sm font-medium text-white"
                : "rounded-full border border-border px-4 py-2 text-sm font-medium text-body transition hover:bg-surface-muted"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
