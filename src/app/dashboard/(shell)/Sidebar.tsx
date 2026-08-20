"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { DASHBOARD_NAV_ITEMS, findActiveNavItem } from "./navConfig";
import { CloseIcon } from "./icons";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform border-r border-border bg-surface transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-surface-muted lg:hidden"
            aria-label="Close menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 px-4">
          {DASHBOARD_NAV_ITEMS.map((item) => {
            const isActive = active?.href === item.href;
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`relative flex h-[46px] items-center gap-3 rounded-xl px-4 text-sm transition-colors ${
                  isActive ? "font-semibold text-primary" : "text-body hover:bg-surface-muted"
                }`}
              >
                <ItemIcon className="h-5 w-5 shrink-0" />
                {item.label}
                {isActive && <span className="absolute right-0 h-6 w-1 rounded-l-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
