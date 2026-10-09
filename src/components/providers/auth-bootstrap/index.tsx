"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/libs/redux/redux";
import { fetchAuthMe } from "@/libs/redux/authSlice";
import { RootState } from "@/libs/redux/store";

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const { status } = useAppSelector((state: RootState) => state.auth);

    useEffect(() => {
        if (status === "idle") {
            void dispatch(fetchAuthMe());
        }
    }, [dispatch, status]);

    return <>{children}</>;
}
