"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey } from "@/libs/constants/configKey";
import type {
    IFromCategoriesData,
    IPaginatedCategoriesQuery,
} from "@/libs/interfaces/categoriesData";
import {
    createCategory,
    deleteCategory,
    getCategories,
    updateCategory,
} from "@/libs/networkApi/categories.api";

export const useGetCategories = (query: IPaginatedCategoriesQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.CATEGORIES, query],
        queryFn: () => getCategories(query),
    });
};

export const useCreateCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: IFromCategoriesData) => createCategory(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.CATEGORIES] });
        },
    });
};

export const useUpdateCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: IFromCategoriesData }) =>
            updateCategory(id, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.CATEGORIES] });
        },
    });
};

export const useDeleteCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.CATEGORIES] });
        },
    });
};
