import { configCookieKey } from "@/libs/constants/configKey";
import getValueCookieServer from "@/libs/utils/getValueCookieServer";
import { getCurrentUser } from "@/server/utils/getCurrentUser";
import {
    clearAccessTokenCookie,
    errorResponseWithStatusCode,
    noStore,
    successResponse,
    unauthorizedResponse,
} from "@/server/utils/responseServer";

export async function GET() {
    try {
        const userInfoAccess = await getCurrentUser();
        if (!userInfoAccess) {
            const response = noStore(unauthorizedResponse());
            const hadToken = !!(await getValueCookieServer(configCookieKey.ACCESS_TOKEN_KEY));
            return hadToken ? clearAccessTokenCookie(response) : response;
        }

        return noStore(
            successResponse(
                {
                    userId: userInfoAccess.userId,
                    email: userInfoAccess.email,
                    phoneNumber: userInfoAccess.phoneNumber,
                    fullName: userInfoAccess.fullName,
                    avatarUrl: userInfoAccess.avatarUrl,
                },
                "Lấy thông tin người dùng thành công",
            ),
        );
    } catch (error: unknown) {
        console.error("Failed to load current user", error);
        return noStore(errorResponseWithStatusCode("Lỗi khi lấy thông tin người dùng", 500));
    }
}
