import { getCurrentUser } from "@/server/utils/getCurrentUser";
import {
    errorResponseWithStatusCode,
    noStore,
    successResponse,
    unauthorizedResponse,
} from "@/server/utils/responseServer";

export async function GET() {
    try {
        const userInfoAccess = await getCurrentUser();
        if (!userInfoAccess) {
            return noStore(unauthorizedResponse());
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
