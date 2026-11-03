/**
 * Màu ổn định cho danh mục / nguồn tiền trong biểu đồ và danh sách: cùng một id luôn ra cùng một màu,
 * không phụ thuộc thứ tự hay tháng đang xem. Bảng màu đọc được trên cả nền sáng và tối.
 */
export const CATEGORY_PALETTE = [
    "#2563eb",
    "#0d9488",
    "#9333ea",
    "#ca8a04",
    "#db2777",
    "#0891b2",
    "#65a30d",
    "#4f46e5",
    "#c2410c",
    "#059669",
] as const;

/** Màu cho nhóm "Khác" / "Không xác định". */
export const OTHER_COLOR = "#a8a29e";

function hashString(value: string) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
}

/** `color` do người dùng chọn (nếu có) được ưu tiên; không có thì băm `id` vào bảng màu. */
export function getCategoryColor(id: string | null | undefined, color?: string | null) {
    if (color) return color;
    if (!id) return OTHER_COLOR;
    return CATEGORY_PALETTE[hashString(id) % CATEGORY_PALETTE.length];
}
