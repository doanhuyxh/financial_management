import type { NextConfig } from "next";
const { NEXT_PUBLIC_NODE_ENV } = process.env;
const isDevelopment = NEXT_PUBLIC_NODE_ENV === 'development';
const loggingDev: NextConfig["logging"] = {
  fetches: {
    fullUrl: true,
    hmrRefreshes: true,
  },
  incomingRequests: true,
  serverFunctions: true,
  browserToTerminal: false,
}

const nextConfig: NextConfig = {
  // deploy.sh build vào thư mục tạm (NEXT_DIST_DIR) trong khi bản cũ vẫn chạy, xong mới đổi sang .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  reactCompiler: false,
  // Production chỉ log lỗi: log mọi request làm file log PM2 phình nhanh.
  logging: isDevelopment ? loggingDev : { incomingRequests: false },
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
      // Icon có tham số phiên bản (?v=3, đổi icon thì tăng số) nên cache 1 năm: không tải lại favicon mỗi lần chuyển trang trên 4G
      {
        source: "/:icon(favicon.ico|apple-touch-icon.png|icon-192.png|icon-512.png)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Ảnh khởi động iOS cũng đổi bằng ?v= (STARTUP_VERSION)
      {
        source: "/startup/:file",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
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
