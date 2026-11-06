"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import type { IFromMcpTokenData } from "@/libs/interfaces/mcpTokensData";
import {
    createMcpToken,
    getMcpTokens,
    revokeAllMcpTokens,
    revokeMcpToken,
} from "@/libs/networkApi/mcpTokens.api";

export const useGetMcpTokens = () => {
    return useQuery({
        queryKey: [configQueryKey.MCP_TOKENS],
        queryFn: () => getMcpTokens(),
    });
};

function useInvalidateMcpTokens() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: [configQueryKey.MCP_TOKENS] });
}

export const useCreateMcpToken = () => {
    const invalidate = useInvalidateMcpTokens();
    return useMutation({
        mutationFn: (body: IFromMcpTokenData) => createMcpToken(body),
        onSuccess: invalidate,
    });
};

export const useRevokeMcpToken = () => {
    const invalidate = useInvalidateMcpTokens();
    return useMutation({
        mutationFn: (id: string) => revokeMcpToken(id),
        onSuccess: invalidate,
    });
};

export const useRevokeAllMcpTokens = () => {
    const invalidate = useInvalidateMcpTokens();
    return useMutation({
        mutationFn: () => revokeAllMcpTokens(),
        onSuccess: invalidate,
    });
};
