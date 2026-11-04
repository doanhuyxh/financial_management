import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { CardRolloversService } from "@/server/services/card-rollovers.service";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        return await CardRolloversService.deleteCardRollover(id, {
            deletePayment: searchParams.get("deletePayment") === "1",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
