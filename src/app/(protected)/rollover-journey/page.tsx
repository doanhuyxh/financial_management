import LoadingComponent from "@/components/common/loading"
import RolloverJourneyComponent from "@/components/features/rollover-journey"
import { Suspense } from "react"

export const metadata = {
  title: "Hành trình đáo hạn",
  description: "Theo dõi một thẻ từ lần đáo hạn đầu tiên đến khi sạch nợ",
}

export default function RolloverJourneyPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <RolloverJourneyComponent />
    </Suspense>
  )
}
