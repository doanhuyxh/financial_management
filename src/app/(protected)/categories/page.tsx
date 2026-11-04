import RouteLoading from "@/components/common/route-loading"
import CategoriesComponent from "@/components/features/categories"
import { Suspense } from "react"

export const metadata = {
  title: "Categories",
  description: "Categories page",
}

export default function Categories() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <CategoriesComponent />
    </Suspense>
  )
}
