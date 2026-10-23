"use client";

import { useMemo } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configQueryKey, QUERY_STALE_TIME } from "@/libs/constants/configKey";
import type {
    CategoryKind,
    IFromCategoriesData,
    IPaginatedCategoriesQuery,
} from "@/libs/interfaces/categoriesData";
import { filterCategoriesByKind } from "@/libs/utils/categoryKind";
import {
    createCategory,
    deleteCategory,
    getCategories,
    reorderCategories,
    updateCategory,
} from "@/libs/networkApi/categories.api";
import { optimisticReorder, restoreQuerySnapshots } from "@/libs/hooks/customHooks/reorderCache";

export const useGetCategories = (query: IPaginatedCategoriesQuery = {}) => {
    return useQuery({
        queryKey: [configQueryKey.CATEGORIES, query],
        queryFn: () => getCategories(query),
        placeholderData: keepPreviousData,
        staleTime: QUERY_STALE_TIME.REFERENCE,
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
            queryClient.invalidateQueries({ queryKey: [configQueryKey.BUDGETS] });
        },
    });
};

export const useReorderCategories = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (orderedIds: string[]) => reorderCategories(orderedIds),
        onMutate: (orderedIds) => optimisticReorder(queryClient, configQueryKey.CATEGORIES, orderedIds),
        onError: (_error, _ids, snapshots) => {
            if (snapshots) restoreQuerySnapshots(queryClient, snapshots);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.CATEGORIES] });
        },
    });
};

export const useCategoryOptions = (kind?: CategoryKind, allLabel?: string) => {
    const query = useGetCategories({ page: 1, limit: 100 });
    const options = useMemo(() => {
        const items = query.data?.data?.items ?? [];
        const mapped = (kind ? filterCategoriesByKind(items, kind) : items).map((item) => ({
            value: item._id,
            label: item.name,
        }));
        if (!allLabel) return mapped;
        return [{ value: "", label: allLabel }, ...mapped];
    }, [query.data, kind, allLabel]);

    return {
        options,
        items: query.data?.data?.items ?? [],
        isLoading: query.isLoading,
    };
};

export const useDeleteCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [configQueryKey.CATEGORIES] });
            queryClient.invalidateQueries({ queryKey: [configQueryKey.BUDGETS] });
        },
    });
};
