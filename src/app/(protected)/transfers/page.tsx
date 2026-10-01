import LoadingComponent from "@/components/common/loading"
import TransfersComponent from "@/components/features/transfers"
import { Suspense } from "react"

export const metadata = {
  title: "Chuyển tiền",
  description: "Chuyển tiền giữa các nguồn",
}

export default async function TransfersPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <TransfersComponent />
    </Suspense>
  )
}
