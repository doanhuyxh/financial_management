import { IDefaultQuery } from "./DefaultQuery";

export interface ICategoriesData {
    _id: string;
    name: string;
    sortOrder: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromCategoriesData {
    name: string;
    sortOrder?: number;
}

export interface IReorderCategoriesData {
    orderedIds: string[];
}

export interface IPaginatedCategoriesQuery extends IDefaultQuery {}
