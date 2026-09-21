import { IDefaultQuery } from "./DefaultQuery";

export interface ICategoriesData {
    _id: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IFromCategoriesData extends Omit<ICategoriesData, "_id" | "createdAt" | "updatedAt"> {}

export interface IPaginatedCategoriesQuery extends IDefaultQuery {}
