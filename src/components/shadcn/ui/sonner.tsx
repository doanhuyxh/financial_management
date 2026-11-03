"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { useIsDarkMode } from "@/libs/hooks/useIsDarkMode"

/** Theme lấy từ class `dark` trên <html> (cùng nguồn với toàn app), không qua next-themes. */
const Toaster = ({ ...props }: ToasterProps) => {
  const isDark = useIsDarkMode()

  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          // Icon màu theo nghĩa, nền giữ trắng/tối như notification cũ
          success: "[&_[data-icon]]:text-money-in",
          error: "[&_[data-icon]]:text-debt",
          warning: "[&_[data-icon]]:text-warn",
          info: "[&_[data-icon]]:text-credit",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
