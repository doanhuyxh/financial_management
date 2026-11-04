import LoadingComponent from "@/components/common/loading"
import SettingsComponent from "@/components/features/settings"
import { Suspense } from "react"

export const metadata = {
  title: "Cài đặt",
  description: "Khóa sổ và lịch sử sửa, xóa giao dịch",
}

export default function Settings() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <SettingsComponent />
    </Suspense>
  )
}
