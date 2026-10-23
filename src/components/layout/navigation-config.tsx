import type { ReactNode } from "react"
import {
    GalleryVerticalEndIcon,
    PieChartIcon,
    ReceiptIcon,
    FolderCogIcon,
} from "lucide-react"
import { MENU_KEY } from "@/libs/constants/menuKey"
export type SidebarTeam = {
    name: string
    logo: ReactNode
    plan: string
}

export type SidebarNavMainItem = {
    title: string
    url: string
    icon: ReactNode
    isActive?: boolean
    items?: {
        title: string
        url: string
    }[]
}

export type SidebarConfig = {
    teams: SidebarTeam
    navMain: SidebarNavMainItem[]
}

export const sidebarConfig: SidebarConfig = {
    teams: {
        name: "Money Manager",
        logo: <GalleryVerticalEndIcon />,
        plan: "Free",
    },
    navMain: [
        {
            title: "Dashboard",
            url: `${MENU_KEY.DASHBOARD}`,
            icon: <PieChartIcon />,
            isActive: true,
        },
        {
            title: "Giao dịch",
            url: "#",
            icon: <ReceiptIcon />,
            items: [
                {
                    title: "Chi tiêu",
                    url: `${MENU_KEY.EXPENSES}`,
                },
                {
                    title: "Thu nhập",
                    url: `${MENU_KEY.INCOMES}`,
                },
                {
                    title: "Chuyển tiền",
                    url: `${MENU_KEY.TRANSFERS}`,
                },
            ],
        },
        {
            title: "Quản lý",
            url: "#",
            icon: <FolderCogIcon />,
            items: [
                {
                    title: "Nguồn tiền",
                    url: `${MENU_KEY.SOURCES_OF_MONEY}`,
                },
                {
                    title: "Danh mục",
                    url: `${MENU_KEY.CATEGORIES}`,
                },
            ],
        },
    ],
}

