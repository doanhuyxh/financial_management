type ArchivableRef = { _id: string; name: string; archivedAt?: string | null };

/** Danh mục/nguồn đã lưu trữ vẫn hiện tên trong lịch sử, kèm hậu tố "(đã xóa)". */
export function withArchivedLabel<T extends ArchivableRef>(ref: T): T {
    return ref.archivedAt ? { ...ref, name: `${ref.name} (đã xóa)` } : ref;
}

/**
 * Khi sửa bản ghi đang gắn danh mục/nguồn đã lưu trữ (không còn trong danh sách),
 * thêm option đó để Select vẫn hiển thị tên thay vì ID.
 */
export function appendCurrentOption<T extends { value: string; label: string }>(
    options: T[],
    ref: { _id: string; name: string } | null | undefined,
): (T | { value: string; label: string })[] {
    if (!ref?._id || options.some((option) => option.value === ref._id)) return options;
    return [...options, { value: ref._id, label: ref.name }];
}
