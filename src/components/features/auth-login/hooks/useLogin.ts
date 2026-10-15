"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { authLogin, type AuthLoginRequest } from "@/libs/networkApi/auth.api";

function safeReturnUrl(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
        return "/dashboard";
    }
    if (value.includes("://")) return "/dashboard";
    return value;
}

export const useLogin = () => {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();

    const mutation = useMutation({
        mutationFn: (request: AuthLoginRequest) => authLogin(request),
    });

    const submit = async (request: AuthLoginRequest) => {
        await mutation.mutateAsync(request);
        queryClient.clear();
        window.location.replace(safeReturnUrl(searchParams.get("returnUrl")));
    };

    return {
        submit,
        isPending: mutation.isPending,
    };
};
