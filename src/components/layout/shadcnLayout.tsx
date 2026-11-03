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
import { cn } from "@/libs/shadcn/utils"
import MobileBottomNav from "@/components/layout/mobile-bottom-nav"
import PrivacyToggle from "@/components/layout/privacy-toggle"
import QuickAddButton from "@/components/common/quick-add-button"
import { Suspense } from "react"

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
              "sticky top-0 z-10 bg-card",
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
            <div className="flex items-center gap-2 px-3 md:px-4">
              <Suspense fallback={null}>
                <QuickAddButton />
              </Suspense>
              <PrivacyToggle />
              <ThemeToggle />
            </div>
          </header>
          {/* Mobile: chừa chỗ cho thanh điều hướng dưới (h-16) để nội dung cuối trang không bị che */}
          <div className="flex min-w-0 flex-1 flex-col gap-4 p-3 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-4 md:pt-5">
            {children}
          </div>
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
