import LoadingComponent from "@/components/common/loading"
import BudgetsComponent from "@/components/features/budgets"
import { Suspense } from "react"

export const metadata = {
  title: "Budgets",
  description: "Budgets page",
}

export default async function Budgets() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <BudgetsComponent />
    </Suspense>
  )
}
