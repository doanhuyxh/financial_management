import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { type ReactNode } from "react";
import "./globals.css";

import NextTopLoader from "nextjs-toploader";
import TanStackProvider from "@/components/providers/tanstack-provider";
import AntdProvider from "@/components/providers/antd-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";
import getValueCookieServer from "@/libs/utils/getValueCookieServer";
import { configCookieKey } from "@/libs/constants/configKey";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Money Manager",
  description: "Money Manager",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await getValueCookieServer(configCookieKey.THEME_KEY);
  const initialTheme = theme === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      className={`${initialTheme} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <TanStackProvider>
          <AntdProvider initialTheme={initialTheme}>
            <ReduxProvider>{children}</ReduxProvider>
          </AntdProvider>
        </TanStackProvider>
        <NextTopLoader />
      </body>
    </html>
  );
}
