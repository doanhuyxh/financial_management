"use client"

import { Fragment, useMemo } from "react"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/shadcn/ui/breadcrumb"
import { useAppSelector } from "@/libs/redux/redux"
import { sidebarConfig } from "@/components/layout/navigation-config"
import { selectPathname } from "@/libs/redux/navigationSlice"

type BreadcrumbItemData = {
    href?: string
    label: string
    isCurrentPage: boolean
}

function isPathMatch(pathname: string, url: string) {
    if (!url || url === "#") {
        return false
    }
    return pathname === url || pathname.startsWith(`${url}/`)
}

function getNavBreadcrumb(pathname: string): BreadcrumbItemData[] {
    for (const item of sidebarConfig.navMain) {
        if (isPathMatch(pathname, item.url)) {
            return [
                {
                    href: item.url,
                    label: item.title,
                    isCurrentPage: true,
                },
            ]
        }
        const activeSubItem = item.items?.find((subItem) => isPathMatch(pathname, subItem.url))
        if (activeSubItem) {
            return [
                {
                    href: item.url !== "#" ? item.url : undefined,
                    label: item.title,
                    isCurrentPage: false,
                },
                {
                    href: activeSubItem.url,
                    label: activeSubItem.title,
                    isCurrentPage: true,
                },
            ]
        }
    }
    return []
}

function prettifySegment(segment: string) {
    return segment
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function BreadcrumbTrail() {
    const pathname = useAppSelector(selectPathname)

    const items = useMemo(() => {
        const navItems = getNavBreadcrumb(pathname)
        if (navItems.length > 0) {
            return navItems
        }
        const segments = pathname.split("/").filter(Boolean)
        if (segments.length === 0) {
            return [
                {
                    href: "/",
                    label: "Home",
                    isCurrentPage: true,
                },
            ]
        }

        return segments.map((segment, index) => {
            const href = `/${segments.slice(0, index + 1).join("/")}`
            const isCurrentPage = index === segments.length - 1

            return {
                href,
                label: prettifySegment(segment),
                isCurrentPage,
            }
        })
    }, [pathname])

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {items.map((item, index) => (
                    <Fragment key={item.href ?? `${item.label}-${index}`}>
                        {index > 0 ? <BreadcrumbSeparator className="hidden md:block" /> : null}
                        <BreadcrumbItem className={index === items.length - 1 ? "" : "hidden md:block"}>
                            {item.isCurrentPage || !item.href ? (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
