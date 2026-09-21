import type { NextRequest } from "next/server";
import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { SourcesOfMoneyService } from "@/server/services/sources-of-money.service";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const search = searchParams.get("search") || "";
        const type = (searchParams.get("type") || "") as SourcesOfMoneyType | "";

        return await SourcesOfMoneyService.getSourcesOfMoney({
            page,
            limit,
            search,
            type,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        return await SourcesOfMoneyService.createSourcesOfMoney(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        return errorResponseWithStatusCode(message);
    }
}
