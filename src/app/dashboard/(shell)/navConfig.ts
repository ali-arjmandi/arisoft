import type { ComponentType, SVGProps } from "react";
import { AnalyzerIcon, BuildingIcon, HomeIcon, InvoiceIcon, MailIcon } from "./icons";

export interface DashboardNavItem {
  href: string;
  label: string;
  subtitle: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    subtitle: "A snapshot of companies, contacts, and email activity.",
    icon: HomeIcon,
  },
  {
    href: "/dashboard/companies",
    label: "Companies",
    subtitle: "Companies saved from the Company Analyzer.",
    icon: BuildingIcon,
  },
  {
    href: "/dashboard/company-analyzer",
    label: "Company analyzer",
    subtitle: "Research a company and find automation opportunities.",
    icon: AnalyzerIcon,
  },
  {
    href: "/dashboard/email",
    label: "Email",
    subtitle: "Edit the fields below, pick a recipient and sender, then send.",
    icon: MailIcon,
  },
  {
    href: "/dashboard/invoice",
    label: "Invoice",
    subtitle: "Fill in the details, then download the PDF. Nothing is saved or sent anywhere.",
    icon: InvoiceIcon,
  },
];

// Longest-prefix match, not a naive per-item startsWith — every dashboard
// path starts with "/dashboard", so a naive match would mark both Overview
// and Companies active on /dashboard/companies/[id].
export function findActiveNavItem(pathname: string): DashboardNavItem | undefined {
  return [...DASHBOARD_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
