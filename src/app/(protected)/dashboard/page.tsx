import RouteLoading from "@/components/common/route-loading"
import DashboardComponent from "@/components/features/dashboard"
import { Suspense } from "react"

export const metadata = {
    title: "Tổng quan",
    description: "Dashboard page",
}

export default function Dashboard() {
  return (
    <Suspense fallback={<RouteLoading variant="dashboard" />}>
      <DashboardComponent />
    </Suspense>
  )
}
