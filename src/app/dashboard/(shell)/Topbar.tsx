"use client";

import { usePathname } from "next/navigation";
import { findActiveNavItem } from "./navConfig";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { MenuIcon } from "./icons";

export function Topbar({
  onMenuClick,
  theme,
  onToggleTheme,
}: {
  onMenuClick: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-full p-2 text-body hover:bg-surface-muted lg:hidden"
            aria-label="Open menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{active?.label ?? "Dashboard"}</h1>
            {active?.subtitle && <p className="mt-0.5 hidden text-sm text-muted sm:block">{active.subtitle}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
