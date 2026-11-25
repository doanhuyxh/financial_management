import ScanPayComponent from "@/components/features/scan-pay"

export const metadata = {
  title: "Quét QR trả tiền",
  description: "Quét VietQR, ghi chi tiêu rồi mở app ngân hàng để chuyển khoản",
}

export default function ScanPayPage() {
  return <ScanPayComponent />
}
