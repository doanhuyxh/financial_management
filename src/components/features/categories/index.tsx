"use client";

import { useMemo, useState } from "react";
import { Button, Input, Space, Table, Tag } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import CategoryFormModal from "@/components/features/categories/components/category-form-modal";
import { useAntdApp } from "@/libs/hooks/useAntdApp";
import { useDebounce } from "@/libs/hooks/useDebounce";
import {
    useCreateCategory,
    useDeleteCategory,
    useGetCategories,
    useUpdateCategory,
} from "@/libs/hooks/customHooks/useCategories";
import type { ICategoriesData } from "@/libs/interfaces/categoriesData";

const DEFAULT_PAGE_SIZE = 10;

export default function CategoriesComponent() {
    const { notification, modal } = useAntdApp();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ICategoriesData | null>(null);

    const query = useMemo(
        () => ({
            page,
            limit: pageSize,
            search: debouncedSearch.trim() || undefined,
        }),
        [page, pageSize, debouncedSearch],
    );

    const { data, isLoading, isFetching } = useGetCategories(query);
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();

    const items = data?.data?.items ?? [];
    const pagination = data?.data?.pagination;

    const openCreateModal = () => {
        setEditingCategory(null);
        setModalOpen(true);
    };

    const openEditModal = (record: ICategoriesData) => {
        setEditingCategory(record);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingCategory(null);
    };

    const handleSubmit = async (values: { name: string }) => {
        try {
            if (editingCategory?._id) {
                await updateMutation.mutateAsync({
                    id: editingCategory._id,
                    body: values,
                });
                notification.success({ title: "Cập nhật danh mục thành công" });
            } else {
                await createMutation.mutateAsync(values);
                notification.success({ title: "Tạo danh mục thành công" });
            }
            closeModal();
        } catch (error: unknown) {
            const message =
                error && typeof error === "object" && "message" in error
                    ? String((error as { message?: string }).message)
                    : "Thao tác thất bại";
            notification.error({ title: message });
        }
    };

    const handleDelete = (record: ICategoriesData) => {
        modal.confirm({
            title: "Xóa danh mục",
            content: `Bạn có chắc muốn xóa "${record.name}"?`,
            okText: "Xóa",
            okType: "danger",
            cancelText: "Hủy",
            onOk: async () => {
                try {
                    await deleteMutation.mutateAsync(record._id);
                    notification.success({ title: "Xóa danh mục thành công" });
                } catch (error: unknown) {
                    const message =
                        error && typeof error === "object" && "message" in error
                            ? String((error as { message?: string }).message)
                            : "Xóa danh mục thất bại";
                    notification.error({ title: message });
                }
            },
        });
    };

    const columns: ColumnsType<ICategoriesData> = [
        {
            title: "STT",
            key: "index",
            width: 72,
            render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
        },
        {
            title: "Tên danh mục",
            dataIndex: "name",
            key: "name",
            render: (name: string) => <span className="font-medium">{name}</span>,
        },
        {
            title: "Ngày tạo",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 180,
            render: (value?: string) =>
                value ? new Date(value).toLocaleString("vi-VN") : "—",
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 140,
            align: "right",
            render: (_value, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        size="small"
                        icon={<Pencil className="size-4" />}
                        onClick={() => openEditModal(record)}
                    />
                    <Button
                        type="text"
                        size="small"
                        danger
                        icon={<Trash2 className="size-4" />}
                        onClick={() => handleDelete(record)}
                    />
                </Space>
            ),
        },
    ];

    const handleTableChange = (pager: TablePaginationConfig) => {
        setPage(pager.current ?? 1);
        setPageSize(pager.pageSize ?? DEFAULT_PAGE_SIZE);
    };

    return (
        <div className="flex flex-col gap-4">
            
            <div className="flex justify-between">
                <Input
                    allowClear
                    prefix={<Search className="size-4 text-muted-foreground" />}
                    placeholder="Tìm kiếm danh mục..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="sm:max-w-xs"
                />
                <Button type="primary" icon={<Plus className="size-4" />} onClick={openCreateModal}>
                    Thêm danh mục
                </Button>
            </div>

            <Table<ICategoriesData>
                rowKey="_id"
                columns={columns}
                dataSource={items}
                loading={isLoading || isFetching}
                pagination={{
                    current: pagination?.page ?? page,
                    pageSize: pagination?.limit ?? pageSize,
                    total: pagination?.total ?? 0,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50],
                    showTotal: (total) => `Tổng ${total} danh mục`,
                }}
                onChange={handleTableChange}
            />

            <CategoryFormModal
                open={modalOpen}
                loading={createMutation.isPending || updateMutation.isPending}
                initialValues={editingCategory}
                onCancel={closeModal}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
