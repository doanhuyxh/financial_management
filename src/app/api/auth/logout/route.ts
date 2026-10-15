import { configCookieKey } from "@/libs/constants/configKey";
import getValueCookieServer from "@/libs/utils/getValueCookieServer";
import dbConnect from "@/server/connectDb";
import UserModel from "@/server/models/users.model";
import { successResponse } from "@/server/utils/responseServer";
import { verifyAccessToken } from "@/server/utils/jwtUtil";

export async function POST() {
    try {
        const accessToken = await getValueCookieServer(configCookieKey.ACCESS_TOKEN_KEY);
        if (accessToken) {
            const payload = await verifyAccessToken(accessToken);
            if (payload?.userId) {
                await dbConnect();
                await UserModel.updateOne(
                    { _id: payload.userId },
                    { $inc: { tokenVersion: 1 } },
                );
            }
        }
    } catch (error) {
        console.error("Failed to revoke auth session", error);
    }

    const response = successResponse(null, "Đăng xuất thành công");
    response.cookies.set({
        name: configCookieKey.ACCESS_TOKEN_KEY,
        value: "",
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
}
