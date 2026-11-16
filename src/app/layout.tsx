import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { type ReactNode } from "react";
import "./globals.css";

import NextTopLoader from "nextjs-toploader";
import ClientApp from "@/components/providers/client-app";
import { THEME_SURFACE } from "@/libs/constants/brandColors";
import { configCookieKey } from "@/libs/constants/configKey";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android Chrome: co layout khi bàn phím ảo mở để Drawer/footer không bị bàn phím che
  interactiveWidget: "resizes-content",
  // Không khai `themeColor` ở đây: nó chỉ theo theme hệ điều hành. Thẻ meta do themeScript tạo theo cookie.
};

export const metadata: Metadata = {
  title: "Money Manager",
  description: "Money Manager",
  applicationName: "Money Manager",
  // Mở từ "Thêm vào MH chính" trên iOS: chạy toàn màn hình như app
  appleWebApp: {
    capable: true,
    title: "Money",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/favicon.ico?v=2",
    apple: "/apple-touch-icon.png?v=2",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

// Đọc theme từ cookie ngay khi parse HTML (trước lần paint đầu) để trang vẫn build tĩnh mà không nháy màu.
// Tạo luôn thẻ meta theme-color (thanh trình duyệt mobile) cùng màu header; ThemeToggle cập nhật khi đổi.
const themeScript = `try{var d=document.cookie.split("; ").indexOf("${configCookieKey.THEME_KEY}=dark")!==-1;if(d)document.documentElement.classList.add("dark");var m=document.createElement("meta");m.name="theme-color";m.content=d?"${THEME_SURFACE.dark}":"${THEME_SURFACE.light}";document.head.appendChild(m)}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <ClientApp>{children}</ClientApp>
        <NextTopLoader showSpinner={false} />
      </body>
    </html>
  );
}
