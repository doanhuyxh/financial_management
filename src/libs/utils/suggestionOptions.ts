import type { SelectProps } from "antd";

type SelectOption = { value: string; label: string };
type SelectOptions = NonNullable<SelectProps["options"]>;

/**
 * Tách option thành nhóm "Thường dùng" (theo thứ tự gợi ý) và "Khác" (giữ thứ tự gốc).
 * Không có gợi ý hợp lệ thì trả về danh sách phẳng như cũ.
 */
export function groupSuggestedOptions<T extends SelectOption>(
    options: T[],
    suggestedIds: string[] | undefined,
): SelectOptions {
    if (!suggestedIds?.length) return options;

    const byValue = new Map(options.map((option) => [option.value, option]));
    const suggested = suggestedIds
        .map((id) => byValue.get(id))
        .filter((option): option is T => Boolean(option));
    if (!suggested.length) return options;

    const suggestedSet = new Set(suggested.map((option) => option.value));
    const rest = options.filter((option) => !suggestedSet.has(option.value));

    const groups: SelectOptions = [
        { label: "Thường dùng", title: "suggested", options: suggested },
    ];
    if (rest.length) {
        groups.push({ label: "Khác", title: "others", options: rest });
    }
    return groups;
}
