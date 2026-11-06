import { Font } from "@react-pdf/renderer";

export const BUYER_FONT_FAMILY = "NotoSans";

let registered = false;

/** Idempotent — react-pdf has no built-in guard against double-registering a family. */
export function registerInvoiceFonts(basePath = ""): void {
  if (registered) return;
  registered = true;

  // basePath: "" is a URL relative to the site in the browser; the server
  // passes the folder holding public/.
  Font.register({
    family: "Poppins",
    fonts: [
      { src: `${basePath}/fonts/poppins/Poppins-Regular.ttf`, fontWeight: 400 },
      { src: `${basePath}/fonts/poppins/Poppins-SemiBold.ttf`, fontWeight: 600 },
      { src: `${basePath}/fonts/poppins/Poppins-Bold.ttf`, fontWeight: 700 },
    ],
  });

  // For what buyers type: extended Latin, Cyrillic and Greek, which Poppins lacks.
  Font.register({
    family: BUYER_FONT_FAMILY,
    fonts: [
      { src: `${basePath}/fonts/noto-sans/NotoSans-Regular.ttf`, fontWeight: 400 },
      { src: `${basePath}/fonts/noto-sans/NotoSans-SemiBold.ttf`, fontWeight: 600 },
    ],
  });
}
