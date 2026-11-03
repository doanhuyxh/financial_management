"use client";

import CategoryContextProvider from "@/components/features/categories/context";
import CategoryFormModal from "@/components/features/categories/components/category-form-modal";
import CategoryHeader from "@/components/features/categories/components/header";
import CategoryGrid from "@/components/features/categories/components/category-grid";

export default function CategoriesComponent() {
    return (
        <CategoryContextProvider>
            <div className="flex flex-col gap-4">
                <CategoryHeader />
                <CategoryGrid />
                <CategoryFormModal />
            </div>
        </CategoryContextProvider>
    );
}
