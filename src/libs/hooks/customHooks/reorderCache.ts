import type { QueryClient } from "@tanstack/react-query";

type SortableRow = { _id: string; sortOrder?: number };

type ListCache = {
    data?: {
        items?: SortableRow[];
    };
};

export async function optimisticReorder(
    queryClient: QueryClient,
    queryKey: string,
    orderedIds: string[],
) {
    await queryClient.cancelQueries({ queryKey: [queryKey] });
    const snapshots = queryClient.getQueriesData<ListCache>({ queryKey: [queryKey] });

    queryClient.setQueriesData<ListCache>({ queryKey: [queryKey] }, (old) => {
        if (!old?.data?.items) return old;
        const byId = new Map(old.data.items.map((item) => [item._id, item]));
        const nextItems: SortableRow[] = [];
        orderedIds.forEach((id, index) => {
            const item = byId.get(id);
            if (item) nextItems.push({ ...item, sortOrder: index });
        });
        if (nextItems.length !== old.data.items.length) return old;
        return {
            ...old,
            data: {
                ...old.data,
                items: nextItems,
            },
        };
    });

    return snapshots;
}

export function restoreQuerySnapshots(
    queryClient: QueryClient,
    snapshots: Array<[readonly unknown[], ListCache | undefined]>,
) {
    snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
    });
}
