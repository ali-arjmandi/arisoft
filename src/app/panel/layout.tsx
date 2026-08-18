import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-muted px-6 py-16">
      <div className="mx-auto mb-10 w-full max-w-3xl">
        <Logo />
      </div>
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  );
}
