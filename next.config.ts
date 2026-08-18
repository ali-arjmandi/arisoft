import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // src/proxy.ts runs on /api/panel/send-email (the panel's email-send
    // route), and Next.js buffers the request body for proxy up to this
    // limit before the route handler ever sees it — default is 10MB, too
    // small for the panel's 25MB attachment allowance.
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
