"use client"

import { useMemo } from "react"
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
  const user = auth.user
  const initials = useMemo(() => {
    const name = user?.name ?? "Guest"
    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }, [user])

  const handleLogout = async () => {
    dispatch(clearAuth())
    await authLogout()
    redirect(EnvsConfig.CLIENT_BASE_URL||"")
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
                <AvatarImage src={user?.avatar ?? ""} alt={user?.name ?? "Guest"} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.name ?? "Guest"}</span>
                <span className="truncate text-xs">{user?.email ?? "Demo auth chưa được bật"}</span>
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
              <LogOutIcon
              />
              {auth.isAuthenticated ? "Log out" : "Restore demo login"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
