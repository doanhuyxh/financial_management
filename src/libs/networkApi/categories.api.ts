import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { PaginatedResponse } from "@/libs/interfaces/ApiResponseData";
import type {
    ICategoriesData,
    IFromCategoriesData,
    IPaginatedCategoriesQuery,
} from "@/libs/interfaces/categoriesData";

function buildCategoriesQuery(query: IPaginatedCategoriesQuery = {}) {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
}

export const getCategories = async (query: IPaginatedCategoriesQuery = {}) => {
    return fetcherBackEnd<ApiResponse<PaginatedResponse<ICategoriesData>>>(
        `/categories${buildCategoriesQuery(query)}`,
        { method: "GET" },
    );
};

export const createCategory = async (body: IFromCategoriesData) => {
    return fetcherBackEnd<ApiResponse<ICategoriesData>>("/categories", {
        method: "POST",
        body,
    });
};

export const updateCategory = async (id: string, body: IFromCategoriesData) => {
    return fetcherBackEnd<ApiResponse<ICategoriesData>>(`/categories/${id}`, {
        method: "PUT",
        body,
    });
};

export const reorderCategories = async (orderedIds: string[]) => {
    return fetcherBackEnd<ApiResponse<null>>("/categories/reorder", {
        method: "PUT",
        body: { orderedIds },
    });
};

export const deleteCategory = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`/categories/${id}`, {
        method: "DELETE",
    });
};
