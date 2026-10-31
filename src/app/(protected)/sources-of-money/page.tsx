import LoadingComponent from "@/components/common/loading"
import SourcesOfMoneyComponent from "@/components/features/sources-of-money"
import { Suspense } from "react"

export const metadata = {
  title: "Nguồn tiền",
  description: "Quản lý nguồn tiền",
}

export default function SourcesOfMoneyPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <SourcesOfMoneyComponent />
    </Suspense>
  )
}
