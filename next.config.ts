import type { NextConfig } from "next";
const { NEXT_PUBLIC_NODE_ENV } = process.env;
const isDevelopment = NEXT_PUBLIC_NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  reactCompiler: true,
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
    incomingRequests: true,
    serverFunctions: true,
    browserToTerminal: false,
  },
  productionBrowserSourceMaps: !isDevelopment,
  compiler: {
    removeConsole: !isDevelopment,
  }
};

export default nextConfig;
