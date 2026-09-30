import LoadingComponent from "@/components/common/loading"
import IncomesComponent from "@/components/features/incomes"
import { Suspense } from "react"

export const metadata = {
  title: "Thu nhập",
  description: "Quản lý thu nhập",
}

export default async function IncomesPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <IncomesComponent />
    </Suspense>
  )
}
