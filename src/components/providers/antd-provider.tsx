"use client"

import { useEffect, useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App, theme as antdTheme } from "antd";

export default function AntdProvider({ children, initialTheme }: { children: React.ReactNode; initialTheme: "light" | "dark" }) {
    const [theme, setTheme] = useState<"light" | "dark">(initialTheme);

    useEffect(() => {
        setTheme(initialTheme);
    }, [initialTheme]);

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

    return (
        <AntdRegistry>
            <ConfigProvider
                theme={{
                    algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                    components: {
                        Card: {
                            headerBg: "var(--primary)",
                            headerFontSize: 16,
                        },
                        Table: {
                            headerBg: "var(--primary)",
                            headerColor: "#fff",
                        },
                        Button: {
                            colorPrimary: "#BC4800",
                            colorPrimaryHover: "#BC4800",
                            colorPrimaryActive: "#BC4800",
                            primaryColor: "#ffffff",
                            colorTextDisabled: theme === "dark" ? "rgba(248, 250, 252, 0.45)" : "rgba(15, 23, 42, 0.35)",
                            colorBgContainerDisabled: theme === "dark" ? "rgba(248, 250, 252, 0.12)" : "rgba(15, 23, 42, 0.06)",
                        },
                        Tabs: {
                            itemColor: "var(--muted-foreground)",
                            itemSelectedColor: "var(--primary)",
                            inkBarColor: "var(--primary)",
                            itemHoverColor: "var(--primary)",
                            itemActiveColor: "var(--primary)",
                        },
                        Menu: {
                            itemColor: "var(--foreground)",
                            itemHoverColor: "var(--primary)",
                            itemSelectedColor: "var(--primary)",
                            popupBg: "var(--popover)",
                        },
                        Breadcrumb: {
                            itemColor: "var(--muted-foreground)",
                            lastItemColor: "var(--foreground)",
                            linkColor: "var(--muted-foreground)",
                            linkHoverColor: "var(--primary)",
                            separatorColor: "var(--muted-foreground)",
                        },
                        DatePicker: {
                            activeBorderColor: "var(--primary)",
                            hoverBorderColor: "var(--primary)",
                            cellActiveWithRangeBg: "var(--primary)",
                            cellHoverWithRangeBg: "var(--primary)",
                            colorPrimary: "var(--primary)",
                        },
                        Calendar: {
                            fullBg: "var(--background)",
                            itemActiveBg: "var(--primary)",
                        },
                        Spin: {
                            colorPrimary: "var(--primary)",
                        },
                        Pagination: {
                            itemActiveBg: "var(--foreground)",
                            itemActiveColor: "var(--primary)",
                            itemActiveColorHover: "var(--primary)",
                        },
                        Typography: {
                            titleMarginTop: 0,
                            titleMarginBottom: 0,
                        },
                        Input: {
                            colorText: theme === "dark" ? "#f8fafc" : "#0f172a",
                            colorBgContainer: theme === "dark" ? "#0f172a" : "#ffffff",
                            colorTextPlaceholder: theme === "dark" ? "#94a3b8" : "#64748b",
                        },
                        InputNumber: {
                            colorText: theme === "dark" ? "#f8fafc" : "#0f172a",
                            colorBgContainer: theme === "dark" ? "#0f172a" : "#ffffff",
                            colorTextPlaceholder: theme === "dark" ? "#94a3b8" : "#64748b",
                        },
                    },
                    token: {
                        fontFamily: "inherit",
                        // Use hex (not CSS vars) so Ant Design can derive Alert/Button/Input colors.
                        colorPrimary: "#BC4800",
                        colorInfo: "#BC4800",
                        colorLink: "#BC4800",
                        colorLinkHover: "#BC4800",
                        colorLinkActive: "#BC4800",
                        colorText: theme === "dark" ? "#f8fafc" : "#0f172a",
                        colorTextSecondary: theme === "dark" ? "#94a3b8" : "#64748b",
                        colorTextDisabled: theme === "dark" ? "rgba(248, 250, 252, 0.45)" : "rgba(15, 23, 42, 0.35)",
                        colorBgContainer: theme === "dark" ? "#0f172a" : "#ffffff",
                        colorBgContainerDisabled: theme === "dark" ? "rgba(248, 250, 252, 0.12)" : "rgba(15, 23, 42, 0.06)",
                        colorBorder: theme === "dark" ? "#1e293b" : "#e2e8f0",
                        // Focus
                        controlOutline: "rgba(188,72,0,0.2)",
                        controlOutlineWidth: 2,
                    },
                }}
                tooltip={{
                    className: "bg-red-500 rounded-lg text-white px-2 py-1 text-xs",
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
        </AntdRegistry>
    )
}