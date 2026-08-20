import { listCompanies } from "@/lib/companies/companies";
import { CompaniesTable } from "./CompaniesTable";

// Reads live data from the database on every request — must not be
// statically prerendered at build time (build has no DB connection).
export const dynamic = "force-dynamic";

export default async function DashboardCompaniesPage() {
  const companies = await listCompanies();
  return <CompaniesTable companies={companies} />;
}
