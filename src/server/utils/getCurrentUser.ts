import { configCookieKey } from "@/libs/constants/configKey";
import getValueCookieServer from "@/libs/utils/getValueCookieServer";
import dbConnect from "@/server/connectDb";
import UserModel from "@/server/models/users.model";
import { getUserInfoFromToken, type JwtPayload } from "@/server/utils/jwtUtil";

export async function getCurrentUser(): Promise<JwtPayload | null> {
    const accessToken = await getValueCookieServer(configCookieKey.ACCESS_TOKEN_KEY);
    if (!accessToken) return null;
    const payload = await getUserInfoFromToken(accessToken);
    if (!payload?.userId) return null;

    await dbConnect();
    const user = await UserModel.findById(payload.userId).select("tokenVersion").lean();
    if (!user) return null;
    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) return null;
    return payload;
}
