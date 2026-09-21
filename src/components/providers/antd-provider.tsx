"use client"

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App, theme as antdTheme } from "antd";

export default function AntdProvider({ children, initialTheme }: { children: React.ReactNode; initialTheme: "light" | "dark" }) {

    return (
        <AntdRegistry>
            <ConfigProvider
                theme={{
                    algorithm: initialTheme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
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