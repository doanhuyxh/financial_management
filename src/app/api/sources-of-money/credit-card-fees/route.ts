import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { SourcesOfMoneyService } from "@/server/services/sources-of-money.service";

export async function GET() {
    try {
        return await SourcesOfMoneyService.getCreditCardFeeProgress();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
