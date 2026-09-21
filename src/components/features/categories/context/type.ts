import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type { ICategoriesData } from "@/libs/interfaces/categoriesData";
import type { TablePaginationConfig } from "antd/es/table";

export interface ICategoryContextProps {
    // values
    search: string;
    page: number;
    pageSize: number;
    items: ICategoriesData[];
    pagination?: PaginatedResponse<ICategoriesData>["pagination"];
    isLoading: boolean;
    modalOpen: boolean;
    editingCategory: ICategoriesData | null;
    isSubmitting: boolean;

    // handlers
    handleSearch: (value: string) => void;
    handleChangePage: (page: number) => void;
    handleChangePageSize: (pageSize: number) => void;
    handleTableChange: (pager: TablePaginationConfig) => void;
    openCreateModal: () => void;
    openEditModal: (record: ICategoriesData) => void;
    closeModal: () => void;
    handleSubmit: (values: { name: string }) => Promise<void>;
    handleDelete: (record: ICategoriesData) => void;
}
