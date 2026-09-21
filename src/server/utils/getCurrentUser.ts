import { configCookieKey } from "@/libs/constants/configKey";
import getValueCookieServer from "@/libs/utils/getValueCookieServer";
import { getUserInfoFromToken, type JwtPayload } from "@/server/utils/jwtUtil";

export async function getCurrentUser(): Promise<JwtPayload | null> {
    const accessToken = await getValueCookieServer(configCookieKey.ACCESS_TOKEN_KEY);
    if (!accessToken) return null;
    return getUserInfoFromToken(accessToken);
}
