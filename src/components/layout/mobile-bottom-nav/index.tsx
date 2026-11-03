"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGridIcon, LandmarkIcon, MenuIcon, PlusIcon, ReceiptIcon } from "lucide-react";
import { useSidebar } from "@/components/shadcn/ui/sidebar";
import { useAppSelector } from "@/libs/redux/redux";
import { selectPathname } from "@/libs/redux/navigationSlice";
import { MENU_KEY } from "@/libs/constants/menuKey";
import { cn } from "@/libs/shadcn/utils";
import { buildTransactionsUrl, parseTransactionType } from "@/libs/utils/transactionsUrl";

const ITEMS = [
    { title: "Tổng quan", url: MENU_KEY.DASHBOARD, icon: LayoutGridIcon },
    { title: "Giao dịch", url: MENU_KEY.TRANSACTIONS, icon: ReceiptIcon },
    { title: "Nguồn tiền", url: MENU_KEY.SOURCES_OF_MONEY, icon: LandmarkIcon },
];

/**
 * Thanh điều hướng dưới (chỉ mobile): Tổng quan · Giao dịch · [+] · Nguồn tiền · Thêm.
 * Nút "+" mở form tạo giao dịch; đang ở trang Giao dịch thì tạo đúng loại đang xem.
 * "Thêm" mở sidebar (Thẻ tín dụng, Danh mục, tài khoản).
 */
export default function MobileBottomNav() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = useAppSelector(selectPathname);
    const { setOpenMobile } = useSidebar();

    const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);
    const isOtherActive = !ITEMS.some((item) => isActive(item.url));

    const handleCreate = () => {
        const type = isActive(MENU_KEY.TRANSACTIONS)
            ? parseTransactionType(searchParams.get("type"))
            : "expense";
        // `t` đổi mỗi lần bấm để trang Giao dịch mount lại và mở form, kể cả khi đang ở đúng trang đó
        router.push(buildTransactionsUrl(type, { action: "create", t: Date.now() }));
    };

    // antd tô mọi <a> bằng colorLink (CSS ngoài layer, thắng class Tailwind) nên cần `!`
    const linkClass = (active: boolean) =>
        cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
            active ? "font-semibold text-accent-text!" : "text-muted-foreground!",
        );

    const [first, second, third] = ITEMS;

    return (
        <nav
            aria-label="Điều hướng chính"
            className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
            style={{ height: "calc(4rem + env(safe-area-inset-bottom))" }}
        >
            {[first, second].map((item) => (
                <Link key={item.url} href={item.url} className={linkClass(isActive(item.url))}>
                    <item.icon className="size-5" />
                    {item.title}
                </Link>
            ))}
            <div className="flex flex-1 items-center justify-center">
                <button
                    type="button"
                    aria-label="Ghi giao dịch"
                    onClick={handleCreate}
                    className="-mt-6 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/40 active:scale-95"
                >
                    <PlusIcon className="size-6" />
                </button>
            </div>
            <Link href={third.url} className={linkClass(isActive(third.url))}>
                <third.icon className="size-5" />
                {third.title}
            </Link>
            <button
                type="button"
                onClick={() => setOpenMobile(true)}
                className={linkClass(isOtherActive)}
            >
                <MenuIcon className="size-5" />
                Thêm
            </button>
        </nav>
    );
}
