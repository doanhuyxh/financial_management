import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { DepositRatesService } from "@/server/services/deposit-rates.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const body = await req.json();
        return await DepositRatesService.updateManual(id, body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        return await DepositRatesService.deleteManual(id);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
