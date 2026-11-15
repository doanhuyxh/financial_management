import RouteLoading from "@/components/common/route-loading"
import SourceHistoryComponent from "@/components/features/source-history"
import { Suspense } from "react"

export const metadata = {
  title: "Lịch sử nguồn tiền",
  description: "Lịch sử giao dịch của một nguồn tiền",
}

// Id đọc phía client (useParams): page không await params để không SSR theo request
export default function SourceHistoryPage() {
  return (
    <Suspense fallback={<RouteLoading variant="list" />}>
      <SourceHistoryComponent />
    </Suspense>
  )
}
