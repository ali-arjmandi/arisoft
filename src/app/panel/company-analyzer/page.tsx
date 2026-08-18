import { PanelNav } from "../PanelNav";
import { LogoutButton } from "../LogoutButton";
import { CompanyAnalyzerForm } from "./CompanyAnalyzerForm";

export default function PanelCompanyAnalyzerPage() {
  return (
    <div>
      <PanelNav />
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Company analyzer</h1>
          <p className="mt-2 text-sm text-body">
            Give it a company name and/or KVK number. It researches the company online and finds
            opportunities for Arisoft to help.
          </p>
        </div>
        <LogoutButton />
      </div>
      <CompanyAnalyzerForm />
    </div>
  );
}
