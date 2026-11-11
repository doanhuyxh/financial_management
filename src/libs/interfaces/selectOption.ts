/** Option của Select/Combobox dùng chung (thay `SelectProps["options"]` của antd). */
export type SelectOption<V extends string = string> = {
    value: V;
    label: string;
    disabled?: boolean;
};

export type SelectOptionGroup<V extends string = string> = {
    label: string;
    /** Khóa nhóm (duy nhất) */
    title: string;
    options: SelectOption<V>[];
};

export type SelectOptionOrGroup<V extends string = string> = SelectOption<V> | SelectOptionGroup<V>;

export function isOptionGroup<V extends string>(
    option: SelectOptionOrGroup<V>,
): option is SelectOptionGroup<V> {
    return Array.isArray((option as SelectOptionGroup<V>).options);
}

/** Trải nhóm thành danh sách phẳng (giữ thứ tự). */
export function flattenOptions<V extends string>(options: SelectOptionOrGroup<V>[]): SelectOption<V>[] {
    return options.flatMap((option) => (isOptionGroup(option) ? option.options : [option]));
}
