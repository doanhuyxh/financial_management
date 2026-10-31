import LoadingComponent from "@/components/common/loading"
import CreditCardCompareComponent from "@/components/features/credit-card-compare"
import { Suspense } from "react"

export const metadata = {
  title: "So sánh thẻ tín dụng",
  description: "So sánh phí và lãi giữa các thẻ tín dụng",
}

export default async function CreditCardComparePage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <CreditCardCompareComponent />
    </Suspense>
  )
}
