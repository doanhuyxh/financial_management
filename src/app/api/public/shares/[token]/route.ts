import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode, noStore } from "@/server/utils/responseServer";
import { ShareLinksService } from "@/server/services/share-links.service";

/** Public: không cần đăng nhập, proxy bỏ qua /api/public. */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    try {
        const { token } = await params;
        return await ShareLinksService.getPublicShareInfo(token);
    } catch (error: unknown) {
        console.error("Public share info failed", error);
        return noStore(errorResponseWithStatusCode("Something went wrong"));
    }
}
