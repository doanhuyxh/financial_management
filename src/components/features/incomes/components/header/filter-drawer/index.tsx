"use client";

import TransactionFilterFields from "@/components/common/transaction-filter-fields";
import { useIncomesContext } from "@/components/features/incomes/context";
import { useCategoryOptions } from "@/libs/hooks/customHooks/useCategories";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { useSourceOptions } from "@/libs/hooks/customHooks/useSourcesOfMoney";

export default function IncomesFilterDrawer({ layout }: { layout: "desktop" | "drawer" }) {
    const {
        categoryFilter,
        sourceFilter,
        dateRange,
        handleCategoryFilter,
        handleSourceFilter,
        handleDateRange,
    } = useIncomesContext();
    const { options: categoryOptions } = useCategoryOptions(CategoryKind.INCOME, "Tất cả danh mục");
    const { options: sourceOptions } = useSourceOptions("Tất cả nguồn tiền");

    return (
        <TransactionFilterFields
            layout={layout}
            categoryFilter={categoryFilter}
            sourceFilter={sourceFilter}
            onCategoryFilter={handleCategoryFilter}
            onSourceFilter={handleSourceFilter}
            categoryOptions={categoryOptions}
            sourceOptions={sourceOptions}
            dateRange={dateRange}
            onDateRange={handleDateRange}
        />
    );
}
