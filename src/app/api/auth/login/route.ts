import { errorResponseWithStatusCode } from "@/server/utils/responseServer";
import { login } from "@/server/services/auth.service";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return errorResponseWithStatusCode("Email và mật khẩu là bắt buộc", 400);
        }
        return await login(email, password);
    } catch (error: any) {
        return errorResponseWithStatusCode(error.message || "Đăng nhập thất bại", 500);
    }
}