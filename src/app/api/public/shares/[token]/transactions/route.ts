import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode, noStore } from "@/server/utils/responseServer";
import { ShareLinksService } from "@/server/services/share-links.service";

/** Public: không cần đăng nhập, proxy bỏ qua /api/public. */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    try {
        const { token } = await params;
        const { searchParams } = new URL(req.url);
        return await ShareLinksService.getPublicShareTransactions(token, {
            page: parseInt(searchParams.get("page") || "1", 10),
            limit: parseInt(searchParams.get("limit") || "20", 10),
            from: searchParams.get("from") || undefined,
            to: searchParams.get("to") || undefined,
        });
    } catch (error: unknown) {
        console.error("Public share transactions failed", error);
        return noStore(errorResponseWithStatusCode("Something went wrong"));
    }
}
