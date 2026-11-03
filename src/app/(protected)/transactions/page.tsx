import LoadingComponent from "@/components/common/loading"
import TransactionsComponent from "@/components/features/transactions"
import { Suspense } from "react"

export const metadata = {
  title: "Giao dịch",
  description: "Chi tiêu, thu nhập và chuyển tiền",
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <TransactionsComponent />
    </Suspense>
  )
}
