import type { InvoiceDocumentData } from "./types";

/**
 * Dynamically imports react-pdf and the document template — keeps the
 * (fairly large) react-pdf bundle out of the initial /panel/invoice page
 * load, since this is only ever called from a click handler anyway.
 */
export async function generateInvoicePdf(data: InvoiceDocumentData): Promise<Blob> {
  const [{ pdf }, { InvoiceDocument }, { registerInvoiceFonts }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./InvoiceDocument"),
    import("./fonts"),
  ]);

  registerInvoiceFonts();

  try {
    return await pdf(<InvoiceDocument data={data} />).toBlob();
  } catch (error) {
    console.error("Invoice PDF: Poppins render failed, falling back to Helvetica.", error);
    return await pdf(<InvoiceDocument data={data} useFallbackFont />).toBlob();
  }
}
