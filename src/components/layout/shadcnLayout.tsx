"use client"

import { AppSidebar } from "@/components/shadcn/app-sidebar"
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail"
import { RouteSync } from "@/components/layout/route-sync"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Separator } from "@/components/shadcn/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/shadcn/ui/sidebar"
import { TooltipProvider } from "@/components/shadcn/ui/tooltip"
import BannerHeader from "../shadcn/banner-header"

export default function ShadcnLayout({
  children,
  theme,
}: {
  children: React.ReactNode
  theme: "light" | "dark"
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <RouteSync />
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
            <div className="flex min-w-0 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <BreadcrumbTrail />
            </div>
            <BannerHeader />
            <div className="px-4">
              <ThemeToggle theme={theme} />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-5">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
