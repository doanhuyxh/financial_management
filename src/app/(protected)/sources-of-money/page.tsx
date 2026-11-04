import RouteLoading from "@/components/common/route-loading"
import SourcesOfMoneyComponent from "@/components/features/sources-of-money"
import { Suspense } from "react"

export const metadata = {
  title: "Nguồn tiền",
  description: "Quản lý nguồn tiền",
}

export default function SourcesOfMoneyPage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <SourcesOfMoneyComponent />
    </Suspense>
  )
}
