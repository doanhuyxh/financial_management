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
import { cn } from "@/libs/shadcn/utils"

export default function ShadcnLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <RouteSync />
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header
            className={cn(
              "flex h-14 shrink-0 items-center justify-between gap-2 md:h-16",
              "sticky top-0 z-10 bg-background",
              "border-b",
              "transition-[width,height] ease-linear",
              "group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            )}
          >
            <div className="flex min-w-0 items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <BreadcrumbTrail />
            </div>
            <div className="hidden min-w-0 flex-1 md:flex">
              <BannerHeader />
            </div>
            <div className="px-3 md:px-4">
              <ThemeToggle />
            </div>
          </header>
          <div className="flex min-w-0 flex-1 flex-col gap-4 p-3 pt-4 pb-safe md:p-4 md:pt-5">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
