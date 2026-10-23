import type { ICategoriesData, IFromCategoriesData } from "@/libs/interfaces/categoriesData";

export interface ICategoryContextProps {
    // values
    search: string;
    items: ICategoriesData[];
    isLoading: boolean;
    isReordering: boolean;
    /** False while search is active (list is only a subset). */
    canReorder: boolean;
    modalOpen: boolean;
    editingCategory: ICategoriesData | null;
    isSubmitting: boolean;

    // handlers
    handleSearch: (value: string) => void;
    handleReorder: (orderedItems: ICategoriesData[]) => Promise<void>;
    openCreateModal: () => void;
    openEditModal: (record: ICategoriesData) => void;
    closeModal: () => void;
    handleSubmit: (values: IFromCategoriesData) => Promise<void>;
    handleDelete: (record: ICategoriesData) => void;
}
