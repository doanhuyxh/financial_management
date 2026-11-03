import { IDefaultQuery } from "./DefaultQuery";

export enum CategoryKind {
    EXPENSE = "EXPENSE",
    INCOME = "INCOME",
}

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
    [CategoryKind.EXPENSE]: "Chi tiêu",
    [CategoryKind.INCOME]: "Thu nhập",
};

export interface ICategoriesData {
    _id: string;
    name: string;
    kind: CategoryKind;
    /** 1 emoji (tùy chọn) */
    icon?: string | null;
    /** #RRGGBB (tùy chọn) */
    color?: string | null;
    sortOrder: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromCategoriesData {
    name: string;
    kind?: CategoryKind;
    /** Chuỗi rỗng / null = bỏ icon */
    icon?: string | null;
    /** Chuỗi rỗng / null = bỏ màu */
    color?: string | null;
    sortOrder?: number;
}

export interface IReorderCategoriesData {
    orderedIds: string[];
}

export interface IPaginatedCategoriesQuery extends IDefaultQuery {
    kind?: CategoryKind | "";
}
