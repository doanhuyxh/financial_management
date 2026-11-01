"use client";

import DayRangeFilter from "@/components/common/day-range-filter";
import SourceTransactionList from "@/components/common/source-transaction-list";
import { usePublicShareContext } from "@/components/features/public-share/context";

export default function ShareTransactions() {
    const {
        isCreditCard,
        range,
        items,
        pagination,
        isTransactionsLoading,
        handleRangeChange,
        handlePageChange,
    } = usePublicShareContext();

    return (
        <div className="flex flex-col gap-3">
            <DayRangeFilter value={range} onChange={handleRangeChange} />
            <SourceTransactionList
                items={items}
                loading={isTransactionsLoading}
                isCreditCard={isCreditCard}
                rowKey={(item, index) => `${item.occurredAt}-${index}`}
                pagination={{
                    current: pagination?.page ?? 1,
                    pageSize: pagination?.limit ?? 20,
                    total: pagination?.total ?? 0,
                    onChange: handlePageChange,
                }}
            />
        </div>
    );
}
