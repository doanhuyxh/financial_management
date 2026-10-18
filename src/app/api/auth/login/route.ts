import { errorResponseWithStatusCode, noStore } from "@/server/utils/responseServer";
import { login } from "@/server/services/auth.service";

function clientIp(request: Request) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim() || "unknown";
    }
    return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();
        if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
            return noStore(errorResponseWithStatusCode("Email và mật khẩu là bắt buộc", 400));
        }
        return await login(email, password, clientIp(request));
    } catch (error: unknown) {
        console.error("Login failed", error);
        return noStore(errorResponseWithStatusCode("Đăng nhập thất bại", 500));
    }
}
