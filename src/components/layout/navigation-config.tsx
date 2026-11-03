import type { ReactNode } from "react"
import {
    CreditCardIcon,
    LandmarkIcon,
    LayoutGridIcon,
    ReceiptIcon,
    TagsIcon,
    WalletIcon,
} from "lucide-react"
import { MENU_KEY } from "@/libs/constants/menuKey"
export type SidebarTeam = {
    name: string
    logo: ReactNode
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
        logo: <WalletIcon />,
    },
    navMain: [
        {
            title: "Tổng quan",
            url: MENU_KEY.DASHBOARD,
            icon: <LayoutGridIcon />,
        },
        {
            title: "Giao dịch",
            url: MENU_KEY.TRANSACTIONS,
            icon: <ReceiptIcon />,
        },
        {
            title: "Nguồn tiền",
            url: MENU_KEY.SOURCES_OF_MONEY,
            icon: <LandmarkIcon />,
        },
        {
            title: "Thẻ tín dụng",
            url: MENU_KEY.CREDIT_CARD_COMPARE,
            icon: <CreditCardIcon />,
        },
        {
            title: "Danh mục",
            url: MENU_KEY.CATEGORIES,
            icon: <TagsIcon />,
        },
    ],
}
