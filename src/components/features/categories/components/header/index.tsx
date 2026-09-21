"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "antd";
import { Plus, Search } from "lucide-react";
import { useCategoryContext } from "@/components/features/categories/context";
import { useDebounce } from "@/libs/hooks/useDebounce";

export default function CategoryHeader() {
    const { search, handleSearch, openCreateModal } = useCategoryContext();

    const [localSearch, setLocalSearch] = useState(search ?? "");
    const debouncedSearch = useDebounce(localSearch, 500);

    useEffect(() => {
        handleSearch(debouncedSearch);
    }, [debouncedSearch, handleSearch]);

    return (
        <div className="flex items-center justify-between gap-3">
            <Input
                allowClear
                prefix={<Search className="size-4 text-muted-foreground" />}
                placeholder="Tìm kiếm danh mục..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="sm:max-w-xs"
            />
            <Button type="primary" icon={<Plus className="size-4" />} onClick={openCreateModal}>
                Thêm danh mục
            </Button>
        </div>
    );
}
