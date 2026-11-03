import type {
    CategoryKind,
    ICategoriesData,
    IFromCategoriesData,
} from "@/libs/interfaces/categoriesData";

export interface ICategoryContextProps {
    // values
    search: string;
    /** Tab đang xem (lọc phía client) */
    kindFilter: CategoryKind;
    /** Danh mục của tab đang xem */
    items: ICategoriesData[];
    kindCounts: Record<CategoryKind, number>;
    /** categoryId → tổng đã chi / đã thu trong tháng hiện tại */
    monthTotals: Record<string, number>;
    isLoading: boolean;
    isReordering: boolean;
    /** False khi đang tìm kiếm (danh sách tải về chỉ là một phần). */
    canReorder: boolean;
    modalOpen: boolean;
    editingCategory: ICategoriesData | null;
    isSubmitting: boolean;

    // handlers
    handleSearch: (value: string) => void;
    handleKindFilter: (value: CategoryKind) => void;
    handleReorder: (orderedItems: ICategoriesData[]) => Promise<void>;
    openCreateModal: () => void;
    openEditModal: (record: ICategoriesData) => void;
    closeModal: () => void;
    handleSubmit: (values: IFromCategoriesData) => Promise<void>;
    handleDelete: (record: ICategoriesData) => void;
}
