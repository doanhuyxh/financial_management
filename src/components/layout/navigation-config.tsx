import type { ReactNode } from "react"
import {
    GalleryVerticalEndIcon,
    PieChartIcon,
    WalletCards,
    CreditCardIcon,
    ListIcon,
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
            title: "Nguồn tiền",
            url: `${MENU_KEY.SOURCES_OF_MONEY}`,
            icon: <WalletCards />,
        },
        {
            title: "Chi tiêu",
            url: `${MENU_KEY.EXPENSES}`,
            icon: <CreditCardIcon />,
        },
        {
            title: "Danh mục",
            url: `${MENU_KEY.CATEGORIES}`,
            icon: <ListIcon />,
        }
    ],
}

