"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type { IPaginatedTransactionAuditsQuery } from "@/libs/interfaces/transactionAuditsData";
import { getTransactionAudits } from "@/libs/networkApi/transaction-audits.api";

/** Mutation sửa/xóa chi, thu, chuyển tiền, đáo hạn đều invalidate key này. */
export const useGetTransactionAudits = (query: IPaginatedTransactionAuditsQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.TRANSACTION_AUDITS, query],
        queryFn: () => getTransactionAudits(query),
        placeholderData: keepPreviousData,
        staleTime: QUERY_STALE_TIME.TRANSACTION,
    });
};
