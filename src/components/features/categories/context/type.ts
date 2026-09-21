import type { ICategoriesData } from "@/libs/interfaces/categoriesData";

export interface ICategoryContextProps {
    // values
    search: string;
    items: ICategoriesData[];
    isLoading: boolean;
    isReordering: boolean;
    modalOpen: boolean;
    editingCategory: ICategoriesData | null;
    isSubmitting: boolean;

    // handlers
    handleSearch: (value: string) => void;
    handleReorder: (orderedItems: ICategoriesData[]) => Promise<void>;
    openCreateModal: () => void;
    openEditModal: (record: ICategoriesData) => void;
    closeModal: () => void;
    handleSubmit: (values: { name: string }) => Promise<void>;
    handleDelete: (record: ICategoriesData) => void;
}
