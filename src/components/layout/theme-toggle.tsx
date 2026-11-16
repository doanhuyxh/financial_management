"use client"

import { useEffect, useState } from "react"
import { MoonStar, SunMedium } from "lucide-react"

import { Button } from "@/components/shadcn/ui/button"
import { THEME_SURFACE } from "@/libs/constants/brandColors"
import { configCookieKey } from "@/libs/constants/configKey"

type Theme = "light" | "dark"

const themeCookieName = configCookieKey.THEME_KEY
const themeCookieMaxAge = 60 * 60 * 24 * 365

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.cookie = `${themeCookieName}=${theme}; path=/; max-age=${themeCookieMaxAge}; samesite=lax`
    // Thẻ meta do themeScript trong layout tạo; đổi theo để thanh trình duyệt mobile khớp header
    document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((meta) => {
            meta.content = THEME_SURFACE[theme]
        })
}

export function ThemeToggle() {
    const [currentTheme, setCurrentTheme] = useState<Theme>("light")

    useEffect(() => {
        setCurrentTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    }, [])

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={currentTheme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            aria-pressed={currentTheme === "dark"}
            className="rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur transition-transform hover:scale-105"
            onClick={() => {
                const next = currentTheme === "dark" ? "light" : "dark"
                applyTheme(next)
                setCurrentTheme(next)
            }}
        >
            {currentTheme === "dark" ? <SunMedium /> : <MoonStar />}
        </Button>
    )
}