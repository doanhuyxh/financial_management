import LoadingComponent from "@/components/common/loading"
import CategoriesComponent from "@/components/features/categories"
import { Suspense } from "react"

export const metadata = {
  title: "Categories",
  description: "Categories page",
}

export default async function Categories() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <CategoriesComponent />
    </Suspense>
  )
}
