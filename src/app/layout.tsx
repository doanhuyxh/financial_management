import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { type ReactNode } from "react";
import "./globals.css";

import NextTopLoader from "nextjs-toploader";
import TanStackProvider from "@/components/providers/tanstack-provider";
import AntdProvider from "@/components/providers/antd-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";
import getValueCookieServer from "@/libs/utils/getValueCookieServer";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await getValueCookieServer(configCookieKey.THEME_KEY);
  const initialTheme = theme === "dark" ? "dark" : "light";

  return (
    <html
      lang="vi"
      className={`${initialTheme} ${beVietnamPro.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <TanStackProvider>
          <AntdProvider initialTheme={initialTheme}>
            <ReduxProvider>{children}</ReduxProvider>
          </AntdProvider>
        </TanStackProvider>
        <NextTopLoader showSpinner={false} />
      </body>
    </html>
  );
}
