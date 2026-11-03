import type { NextConfig } from "next";
const { NEXT_PUBLIC_NODE_ENV } = process.env;
const isDevelopment = NEXT_PUBLIC_NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // deploy.sh build vào thư mục tạm (NEXT_DIST_DIR) trong khi bản cũ vẫn chạy, xong mới đổi sang .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: false,
  reactCompiler: false,
  // Production chỉ log lỗi: log mọi request làm file log PM2 phình nhanh.
  logging: isDevelopment
    ? {
        fetches: {
          fullUrl: true,
          hmrRefreshes: true,
        },
        incomingRequests: true,
        serverFunctions: true,
        browserToTerminal: false,
      }
    : { incomingRequests: false },
  productionBrowserSourceMaps: false,
  compiler: {
    // Giữ console.error/warn để còn đọc được lỗi server trong logs/error.log.
    removeConsole: isDevelopment ? false : { exclude: ["error", "warn"] },
  },
  // Chi tiêu / thu nhập / chuyển tiền đã gộp vào /transactions?type=… (query cũ như action=create được giữ nguyên)
  async redirects() {
    return [
      { source: "/expenses", destination: "/transactions?type=expense", permanent: false },
      { source: "/incomes", destination: "/transactions?type=income", permanent: false },
      { source: "/transfers", destination: "/transactions?type=transfer", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
