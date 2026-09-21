import LoadingComponent from "@/components/common/loading"
import ExpensesComponent from "@/components/features/expenses"
import { Suspense } from "react"

export const metadata = {
  title: "Chi tiêu",
  description: "Quản lý chi tiêu",
}

export default async function ExpensesPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <ExpensesComponent />
    </Suspense>
  )
}
