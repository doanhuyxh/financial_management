"use client"

import { useEffect, useMemo, useState } from "react";
import type { ThemeConfig } from "antd";
import { ConfigProvider, App, theme as antdTheme } from "antd";
import vi_VN from 'antd/locale/vi_VN';
import { THEME_COLORS } from "@/libs/constants/themeColors";

export default function AntdProvider({ children }: { children: React.ReactNode }) {
    // Chỉ render trên client (xem ClientApp); class "dark" đã được inline script trong root layout gắn sẵn.
    const [theme, setTheme] = useState<"light" | "dark">(() =>
        document.documentElement.classList.contains("dark") ? "dark" : "light",
    );

    useEffect(() => {
        const syncThemeFromDom = () => {
            const isDark = document.documentElement.classList.contains("dark");
            setTheme(prev => {
                const next = isDark ? "dark" : "light";
                if (prev === next) return prev;
                return next;
            });
        };
        syncThemeFromDom();
        const observer = new MutationObserver(() => {
            requestAnimationFrame(syncThemeFromDom);
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    // Stable reference: a new theme object forces antd to recompute tokens and
    // regenerate CSS-in-JS for the whole tree.
    const themeConfig = useMemo<ThemeConfig>(() => {
        const c = THEME_COLORS[theme];
        return {
            algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
            components: {
                Table: {
                    headerBg: c.card2,
                    headerColor: c.muted,
                    headerSplitColor: "transparent",
                    headerSortActiveBg: c.card2,
                    headerSortHoverBg: c.card2,
                    rowHoverBg: c.bg,
                    fontWeightStrong: 600,
                },
                Button: {
                    primaryColor: "#ffffff",
                    primaryShadow: "none",
                    colorTextDisabled: c.disabledText,
                    colorBgContainerDisabled: c.disabledBg,
                },
                Tabs: {
                    itemColor: c.muted,
                    itemSelectedColor: c.accentText,
                    inkBarColor: c.primary,
                    itemHoverColor: c.accentText,
                    itemActiveColor: c.accentText,
                },
                Menu: {
                    itemColor: c.fg,
                    itemHoverColor: c.accentText,
                    itemSelectedColor: c.accentText,
                    popupBg: c.card,
                },
                Breadcrumb: {
                    itemColor: c.muted,
                    lastItemColor: c.fg,
                    linkColor: c.muted,
                    linkHoverColor: c.accentText,
                    separatorColor: c.muted,
                },
                Typography: {
                    titleMarginTop: 0,
                    titleMarginBottom: 0,
                },
            },
            token: {
                fontFamily: "inherit",
                // Hex (không dùng CSS var) để antd tự sinh màu hover/active/nền nhạt.
                colorPrimary: c.primary,
                colorInfo: c.primary,
                colorLink: c.accentText,
                colorSuccess: c.moneyIn,
                colorError: c.debt,
                colorWarning: c.warn,
                colorText: c.fg,
                colorTextSecondary: c.muted,
                colorTextPlaceholder: c.muted,
                colorTextDisabled: c.disabledText,
                colorBgLayout: c.bg,
                colorBgContainer: c.card,
                colorBgElevated: c.card,
                colorBgContainerDisabled: c.disabledBg,
                colorBorder: c.border,
                colorBorderSecondary: c.border,
                colorSplit: c.border,
                borderRadius: 8,
                borderRadiusLG: 12,
                controlOutline: "rgba(188, 72, 0, 0.2)",
                controlOutlineWidth: 2,
            },
        };
    }, [theme]);

    return (
        <ConfigProvider
            locale={vi_VN}
            theme={themeConfig}
            tooltip={{
                arrow: {
                    pointAtCenter: true,
                }
            }}
        >
            <App
                message={{
                    top: 80,
                    duration: 3,
                    maxCount: 10,
                }}
                notification={{
                    placement: "bottomRight",
                    duration: 3,
                    maxCount: 10,
                    showProgress: true,
                }}
            >
                {children}
            </App>
        </ConfigProvider>
    )
}