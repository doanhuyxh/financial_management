"use client";

import RouteLoading from "@/components/common/route-loading";
import ScanPayContextProvider, { useScanPayContext } from "@/components/features/scan-pay/context";
import PaymentDone from "@/components/features/scan-pay/components/payment-done";
import PaymentForm from "@/components/features/scan-pay/components/payment-form";
import QrScanner from "@/components/features/scan-pay/components/qr-scanner";

function ScanPaySteps() {
    const { step, isDataLoading } = useScanPayContext();
    if (step === "scan") return <QrScanner />;
    if (step === "done") return <PaymentDone />;
    // Form điền sẵn từ danh sách nguồn/danh mục: đợi tải xong mới mở
    return isDataLoading ? <RouteLoading variant="form" /> : <PaymentForm />;
}

/** Quét VietQR → ghi chi tiêu → mở app ngân hàng. Nghiệp vụ: .agents/business/scan-pay.md */
export default function ScanPayComponent() {
    return (
        <ScanPayContextProvider>
            <ScanPaySteps />
        </ScanPayContextProvider>
    );
}
