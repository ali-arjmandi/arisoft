import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // src/proxy.ts runs on /api/dashboard/send-email (the dashboard's email-send
    // route), and Next.js buffers the request body for proxy up to this
    // limit before the route handler ever sees it — default is 10MB, too
    // small for the dashboard's 25MB attachment allowance.
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
