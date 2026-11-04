import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { SettingsService } from "@/server/services/settings.service";

export async function GET() {
    try {
        return await SettingsService.getSettings();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        return await SettingsService.updateSettings(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
