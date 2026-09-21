"use client"

import * as React from "react"

import { sidebarConfig } from "@/components/layout/navigation-config"
import { NavMain } from "@/components/shadcn/nav-main"
import { NavUser } from "@/components/shadcn/nav-user"
import { ProjectIdentity } from "@/components/shadcn/project-indentity"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/shadcn/ui/sidebar"
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectIdentity project={sidebarConfig.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarConfig.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
