import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { ShareLinksService } from "@/server/services/share-links.service";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ shareId: string }> },
) {
    try {
        const { shareId } = await params;
        return await ShareLinksService.revokeShareLink(shareId);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
