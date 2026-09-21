"use client";

import CategoryContextProvider from "@/components/features/categories/context";
import CategoryFormModal from "@/components/features/categories/components/category-form-modal";
import CategoryHeader from "@/components/features/categories/components/header";
import CategoryTable from "@/components/features/categories/components/category-table";

export default function CategoriesComponent() {
    return (
        <CategoryContextProvider>
            <div className="flex flex-col gap-4">
                <CategoryHeader />
                <CategoryTable />
                <CategoryFormModal />
            </div>
        </CategoryContextProvider>
    );
}
