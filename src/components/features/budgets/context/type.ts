import type { Dayjs } from "dayjs";
import type { IBudgetData, IFromBudgetData } from "@/libs/interfaces/budgetsData";

export interface IBudgetCategoryOption {
    /** "" = ngân sách tổng */
    value: string;
    label: string;
}

export interface IBudgetsContextProps {
    // values
    monthValue: Dayjs;
    items: IBudgetData[];
    isLoading: boolean;
    modalOpen: boolean;
    editingItem: IBudgetData | null;
    isSubmitting: boolean;
    /** Danh mục chi tiêu chưa có ngân sách (kèm "Tổng chi tiêu" nếu chưa có). */
    categoryOptions: IBudgetCategoryOption[];
    isCategoriesLoading: boolean;

    // handlers
    handleChangeMonth: (value: Dayjs | null) => void;
    openCreateModal: () => void;
    openEditModal: (record: IBudgetData) => void;
    closeModal: () => void;
    handleSubmit: (values: IFromBudgetData) => Promise<void>;
    handleDelete: (record: IBudgetData) => void;
}
