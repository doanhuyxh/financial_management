import { getUserInfoFromToken } from "@/server/utils/jwtUtil";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "@/server/utils/responseServer";
import { configCookieKey } from "@/libs/constants/configKey";
import getValueCookieServer from "@/libs/utils/getValueCookieServer";

export async function GET() {
    try {
        const accessToken = await getValueCookieServer(configCookieKey.ACCESS_TOKEN_KEY);
        if (!accessToken) {
            return unauthorizedResponse();
        }
        const userInfoAccess = await getUserInfoFromToken(accessToken);
        if (!userInfoAccess) {
            return unauthorizedResponse();
        }

        return successResponse(
            {
                userId: userInfoAccess.userId,
                email: userInfoAccess.email,
                phoneNumber: userInfoAccess.phoneNumber,
                fullName: userInfoAccess.fullName,
                avatarUrl: userInfoAccess.avatarUrl,
            },
            "Lấy thông tin người dùng thành công",
        );
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Lỗi khi lấy thông tin người dùng";
        return errorResponseWithStatusCode(message, 500);
    }
}
