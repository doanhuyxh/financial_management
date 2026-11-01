"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/libs/redux/redux";
import { fetchAuthMe } from "@/libs/redux/authSlice";
import { RootState } from "@/libs/redux/store";
import { SHARE_PATH } from "@/libs/interfaces/shareLinksData";

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const pathname = usePathname();
    const { status } = useAppSelector((state: RootState) => state.auth);
    // Trang link chia sẻ public: người xem không đăng nhập, gọi /auth/me sẽ bị đá về trang login
    const isPublicPage = pathname?.startsWith(`${SHARE_PATH}/`);

    useEffect(() => {
        if (status === "idle" && !isPublicPage) {
            void dispatch(fetchAuthMe());
        }
    }, [dispatch, status, isPublicPage]);

    return <>{children}</>;
}
