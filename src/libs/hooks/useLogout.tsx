"use client";

import { useQueryClient } from "@tanstack/react-query";
import { authLogout } from "@/libs/networkApi/auth.api";
import { clearAuth } from "@/libs/redux/authSlice";
import { useAppDispatch } from "@/libs/redux/redux";

export function useLogout() {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    return async () => {
        try {
            await authLogout();
        } finally {
            await queryClient.cancelQueries();
            queryClient.clear();
            dispatch(clearAuth());
            window.location.replace("/");
        }
    };
}
