
import { cookies } from "next/headers";
import { successResponse } from "@/server/utils/responseServer";

export async function GET() {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    allCookies.forEach((cookie) => {
        cookieStore.delete(cookie.name);
    });
    return successResponse(null, "Logged out successfully");
}