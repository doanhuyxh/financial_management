"use client"

import Link from "next/link"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/shadcn/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/shadcn/ui/sidebar"
import { useAppSelector } from "@/libs/redux/redux"
import { selectPathname } from "@/libs/redux/navigationSlice"
import { ChevronRightIcon } from "lucide-react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = useAppSelector(selectPathname)

  const isPathActive = (url: string) => {
    if (!url || url === "#") {
      return false
    }

    return pathname === url || pathname.startsWith(`${url}/`)
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = Boolean(item.items?.length)
          const hasActiveSubItem = Boolean(item.items?.some((subItem) => isPathActive(subItem.url)))
          const isItemActive = hasActiveSubItem || isPathActive(item.url)

          if (!hasSubItems) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isItemActive}>
                  <Link href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={`${item.title}-${pathname}`}
              asChild
              defaultOpen={isItemActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={isItemActive}>
                    {item.icon}
                    <span>{item.title}</span>
                    <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={isPathActive(subItem.url)}>
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
