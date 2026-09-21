import LoadingComponent from "@/components/common/loading"
import DashboardComponent from "@/components/features/dashboard"
import { Suspense } from "react"

export const metadata = {
    title: "Dashboard",
    description: "Dashboard page",
}

export default async function Dashboard() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <DashboardComponent />
    </Suspense>
  )
}
