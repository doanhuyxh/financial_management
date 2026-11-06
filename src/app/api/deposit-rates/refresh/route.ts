import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { DepositRatesService } from "@/server/services/deposit-rates.service";

/** Lấy lại lãi suất từ trang ngân hàng ngay (có khoảng nghỉ 10 phút). */
export async function POST() {
    try {
        return await DepositRatesService.refresh();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
