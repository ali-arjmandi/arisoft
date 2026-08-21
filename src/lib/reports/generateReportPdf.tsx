import type { ClientReportData } from "./clientReportData";

/**
 * Dynamically imports react-pdf and the document template — keeps the
 * (fairly large) react-pdf bundle out of the public report page's initial
 * load, since this is only ever called from a click handler anyway.
 */
export async function generateReportPdf(data: ClientReportData): Promise<Blob> {
  const [{ pdf }, { ClientReportDocument }, { registerInvoiceFonts }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./ClientReportDocument"),
    // Same Poppins family/files already registered for invoices — reused
    // as-is rather than duplicated, despite the "invoice" name.
    import("@/lib/invoice/fonts"),
  ]);

  registerInvoiceFonts();

  try {
    return await pdf(<ClientReportDocument data={data} />).toBlob();
  } catch (error) {
    console.error("Report PDF: Poppins render failed, falling back to Helvetica.", error);
    return await pdf(<ClientReportDocument data={data} useFallbackFont />).toBlob();
  }
}
