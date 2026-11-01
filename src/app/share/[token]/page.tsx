import LoadingComponent from "@/components/common/loading"
import PublicShareComponent from "@/components/features/public-share"
import { Suspense } from "react"

export const metadata = {
  title: "Lịch sử giao dịch",
  description: "Lịch sử giao dịch được chia sẻ",
  referrer: "no-referrer",
}

// Token đọc phía client (useParams): page không await params để không SSR theo request
export default function PublicSharePage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <PublicShareComponent />
    </Suspense>
  )
}
