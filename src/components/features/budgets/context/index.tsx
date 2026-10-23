"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import {
    useCreateBudget,
    useDeleteBudget,
    useGetBudgets,
    useUpdateBudget,
} from "@/libs/hooks/customHooks/useBudgets";
import { useCategoryOptions } from "@/libs/hooks/customHooks/useCategories";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import type { IBudgetData, IFromBudgetData } from "@/libs/interfaces/budgetsData";
import type { IBudgetCategoryOption, IBudgetsContextProps } from "./type";

const TOTAL_BUDGET_OPTION: IBudgetCategoryOption = {
    value: "",
    label: "Tổng chi tiêu (mọi danh mục)",
};

interface IBudgetsContextProviderProps {
    children: React.ReactNode;
}

const BudgetsContext = createContext<IBudgetsContextProps | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return fallback;
}

export default function BudgetsContextProvider({ children }: IBudgetsContextProviderProps) {
    const { notification, modal } = useAntdApp();

    const [monthValue, setMonthValue] = useState<Dayjs>(() => dayjs());
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<IBudgetData | null>(null);

    const query = useMemo(
        () => ({ year: monthValue.year(), month: monthValue.month() + 1 }),
        [monthValue],
    );

    const { data, isLoading, isFetching, isPlaceholderData } = useGetBudgets(query);
    const { options: expenseCategoryOptions, isLoading: isCategoriesLoading } =
        useCategoryOptions(CategoryKind.EXPENSE);
    const { mutateAsync: createBudget, isPending: isCreating } = useCreateBudget();
    const { mutateAsync: updateBudget, isPending: isUpdating } = useUpdateBudget();
    const { mutateAsync: deleteBudget } = useDeleteBudget();

    const items = useMemo(() => data?.data?.items ?? [], [data?.data?.items]);

    const categoryOptions = useMemo(() => {
        const budgeted = new Set(items.map((item) => item.categoryId ?? ""));
        const options = expenseCategoryOptions.filter((option) => !budgeted.has(option.value));
        return budgeted.has("") ? options : [TOTAL_BUDGET_OPTION, ...options];
    }, [items, expenseCategoryOptions]);

    const handleChangeMonth = useCallback((value: Dayjs | null) => {
        if (value) setMonthValue(value);
    }, []);

    const openCreateModal = useCallback(() => {
        setEditingItem(null);
        setModalOpen(true);
    }, []);

    const openEditModal = useCallback((record: IBudgetData) => {
        setEditingItem(record);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setEditingItem(null);
    }, []);

    const handleSubmit = useCallback(
        async (values: IFromBudgetData) => {
            try {
                if (editingItem?._id) {
                    await updateBudget({ id: editingItem._id, body: { amount: values.amount } });
                    notification.success({ title: "Cập nhật ngân sách thành công" });
                } else {
                    await createBudget(values);
                    notification.success({ title: "Tạo ngân sách thành công" });
                }
                closeModal();
            } catch (error: unknown) {
                notification.error({ title: getErrorMessage(error, "Thao tác thất bại") });
            }
        },
        [editingItem, updateBudget, createBudget, notification, closeModal],
    );

    const handleDelete = useCallback(
        (record: IBudgetData) => {
            modal.confirm({
                title: "Xóa ngân sách",
                content: `Bạn có chắc muốn xóa ngân sách "${record.categoryName}"?`,
                okText: "Xóa",
                okType: "danger",
                cancelText: "Hủy",
                onOk: async () => {
                    try {
                        await deleteBudget(record._id);
                        notification.success({ title: "Xóa ngân sách thành công" });
                    } catch (error: unknown) {
                        notification.error({
                            title: getErrorMessage(error, "Xóa ngân sách thất bại"),
                        });
                    }
                },
            });
        },
        [modal, deleteBudget, notification],
    );

    const value = useMemo<IBudgetsContextProps>(
        () => ({
            monthValue,
            items,
            // Only show loading for first load or a month change
            isLoading: isLoading || (isFetching && isPlaceholderData),
            modalOpen,
            editingItem,
            isSubmitting: isCreating || isUpdating,
            categoryOptions,
            isCategoriesLoading,
            handleChangeMonth,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
        }),
        [
            monthValue,
            items,
            isLoading,
            isFetching,
            isPlaceholderData,
            modalOpen,
            editingItem,
            isCreating,
            isUpdating,
            categoryOptions,
            isCategoriesLoading,
            handleChangeMonth,
            openCreateModal,
            openEditModal,
            closeModal,
            handleSubmit,
            handleDelete,
        ],
    );

    return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
}

export const useBudgetsContext = () => {
    const context = useContext(BudgetsContext);
    if (!context) {
        throw new Error("useBudgetsContext must be used within a BudgetsContextProvider");
    }
    return context;
};
