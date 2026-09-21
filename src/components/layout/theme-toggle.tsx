"use client"

import { useEffect, useState } from "react"
import { MoonStar, SunMedium } from "lucide-react"

import { Button } from "@/components/shadcn/ui/button"

type Theme = "light" | "dark"

const themeCookieName = "theme"
const themeCookieMaxAge = 60 * 60 * 24 * 365

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.cookie = `${themeCookieName}=${theme}; path=/; max-age=${themeCookieMaxAge}; samesite=lax`
}

export function ThemeToggle({ theme }: { theme: Theme }) {
    const [currentTheme, setCurrentTheme] = useState<Theme>(theme)

    useEffect(() => {
        applyTheme(currentTheme)
    }, [currentTheme])

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={currentTheme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            aria-pressed={currentTheme === "dark"}
            className="rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur transition-transform hover:scale-105"
            onClick={() => setCurrentTheme(currentTheme === "dark" ? "light" : "dark")}
        >
            {currentTheme === "dark" ? <SunMedium /> : <MoonStar />}
        </Button>
    )
}