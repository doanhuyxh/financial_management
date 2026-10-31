import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { type ReactNode } from "react";
import "./globals.css";

import NextTopLoader from "nextjs-toploader";
import ClientApp from "@/components/providers/client-app";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "Money Manager",
  description: "Money Manager",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
const themeScript = `try{if(document.cookie.split("; ").indexOf("${configCookieKey.THEME_KEY}=dark")!==-1)document.documentElement.classList.add("dark")}catch(e){}`;

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
