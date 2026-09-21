"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/libs/redux/redux"
import { clearAuth, selectAuth } from "@/libs/redux/authSlice"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/shadcn/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/shadcn/ui/sidebar"
import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react"
import { authLogout } from "@/libs/networkApi/auth.api"
import { redirect } from "next/navigation"
import { EnvsConfig } from "@/libs/constants/configKey"

export function NavUser() {
  const dispatch = useAppDispatch()
  const auth = useAppSelector(selectAuth)
  const { isMobile } = useSidebar()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keep SSR and first client paint identical to avoid Avatar hydration mismatch
  const user = mounted ? auth.user : null
  const displayName = user?.fullName || user?.email || "Guest"
  const secondaryText = !mounted
    ? "..."
    : user?.email ?? (auth.status === "loading" ? "Đang tải..." : "Chưa đăng nhập")

  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }, [displayName])

  const handleLogout = async () => {
    dispatch(clearAuth())
    await authLogout()
    redirect(EnvsConfig.CLIENT_BASE_URL || "/")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user?.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="rounded-lg" suppressHydrationWarning>
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium" suppressHydrationWarning>
                  {displayName}
                </span>
                <span className="truncate text-xs" suppressHydrationWarning>
                  {secondaryText}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
