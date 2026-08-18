import { Font } from "@react-pdf/renderer";

let registered = false;

/** Idempotent — react-pdf has no built-in guard against double-registering a family. */
export function registerInvoiceFonts(): void {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Poppins",
    fonts: [
      { src: "/fonts/poppins/Poppins-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/poppins/Poppins-SemiBold.ttf", fontWeight: 600 },
      { src: "/fonts/poppins/Poppins-Bold.ttf", fontWeight: 700 },
    ],
  });
}
