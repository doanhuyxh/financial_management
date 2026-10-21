import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { SuggestionsService } from "@/server/services/suggestions.service";

export async function GET() {
    try {
        return await SuggestionsService.getExpenseSuggestions();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
