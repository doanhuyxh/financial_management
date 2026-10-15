import { Suspense } from "react";
import AuthLoginComponent from "@/components/features/auth-login";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <AuthLoginComponent />
    </Suspense>
  );
}
