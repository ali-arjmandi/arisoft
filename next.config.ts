import type { NextConfig } from "next";

// The server renders invoice PDFs from these files. public/ is served by the
// CDN, so without this they would not be inside the Lambda.
const invoicePdfFiles = [
  "./public/fonts/poppins/*.ttf",
  "./public/fonts/noto-sans/*.ttf",
  "./public/images/logo/full-lockup-transparent-blue.png",
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/invoices/**": invoicePdfFiles,
    "/api/cron/tick": invoicePdfFiles,
  },
  experimental: {
    // src/proxy.ts runs on /api/dashboard/send-email (the dashboard's email-send
    // route), and Next.js buffers the request body for proxy up to this
    // limit before the route handler ever sees it — default is 10MB, too
    // small for the dashboard's 25MB attachment allowance.
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
