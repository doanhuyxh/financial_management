import type { CategoryKind, ICategoriesData } from "@/libs/interfaces/categoriesData";

/**
 * Lọc danh mục theo loại. `keepId` giữ lại danh mục đang gắn với bản ghi khi sửa,
 * kể cả khi khác loại (dữ liệu cũ), để Select vẫn hiển thị được tên.
 */
export function filterCategoriesByKind(
    items: ICategoriesData[],
    kind: CategoryKind,
    keepId?: string,
) {
    return items.filter((item) => !item.kind || item.kind === kind || item._id === keepId);
}
