import { PanelNav } from "../PanelNav";
import { LogoutButton } from "../LogoutButton";
import { InvoiceForm } from "./InvoiceForm";

export default function PanelInvoicePage() {
  return (
    <div>
      <PanelNav />
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Create invoice</h1>
          <p className="mt-2 text-sm text-body">
            Fill in the details, then download the PDF. Nothing is saved or sent anywhere.
          </p>
        </div>
        <LogoutButton />
      </div>
      <InvoiceForm />
    </div>
  );
}
