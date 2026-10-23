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
    sortOrder: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromCategoriesData {
    name: string;
    kind?: CategoryKind;
    sortOrder?: number;
}

export interface IReorderCategoriesData {
    orderedIds: string[];
}

export interface IPaginatedCategoriesQuery extends IDefaultQuery {}
