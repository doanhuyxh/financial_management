/**
 * Kéo-thả trong một phần của danh sách (một nhóm, hoặc khi đang ẩn bớt mục) nhưng API reorder cần
 * thứ tự của **toàn bộ** danh sách: giữ nguyên vị trí các mục không nằm trong `reorderedSubset`,
 * các vị trí của mục trong subset được điền lần lượt theo thứ tự mới.
 *
 * VD: full = [A, b, C, d, E] (chữ hoa là subset), subset mới = [E, A, C] → [E, b, A, d, C].
 */
export function mergeSubsetOrder<T extends { _id: string }>(full: T[], reorderedSubset: T[]): T[] {
    const subsetIds = new Set(reorderedSubset.map((item) => item._id));
    let cursor = 0;
    return full.map((item) => (subsetIds.has(item._id) ? reorderedSubset[cursor++] : item));
}
