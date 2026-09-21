"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/libs/redux/redux";
import { fetchAuthMe, selectAuth } from "@/libs/redux/authSlice";

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const { status } = useAppSelector(selectAuth);

    useEffect(() => {
        if (status === "idle") {
            void dispatch(fetchAuthMe());
        }
    }, [dispatch, status]);

    return <>{children}</>;
}
