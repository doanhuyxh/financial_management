import { NextResponse, type NextRequest } from "next/server";
import { unauthorizedResponse } from "@/server/utils/responseServer";
import { verifyAccessToken } from "@/server/utils/jwtUtil";
import { configCookieKey } from "@/libs/constants/configKey";
import getValueCookieServer from "@/libs/utils/getValueCookieServer";

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim() || "";
    }
    return (
        request.headers.get("x-real-ip")?.trim() ||
        request.headers.get("cf-connecting-ip")?.trim() ||
        ""
    );
}

function nextWithClientMeta(
    request: NextRequest,
    extraHeaders?: Record<string, string>,
): NextResponse {
    const requestHeaders = new Headers(request.headers);
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent")?.trim() || "";

    if (ip) {
        requestHeaders.set("x-client-ip", ip);
    }
    if (userAgent) {
        requestHeaders.set("x-user-agent", userAgent);
    }
    if (extraHeaders) {
        for (const [key, value] of Object.entries(extraHeaders)) {
            requestHeaders.set(key, value);
        }
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

function redirectToLogin(request: NextRequest) {
    const url = request.nextUrl.clone();
    const returnUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("returnUrl", returnUrl);
    return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const accessToken = await getValueCookieServer(configCookieKey.ACCESS_TOKEN_KEY);
    const verifyResult = accessToken ? await verifyAccessToken(accessToken) : null;

    if (pathname === "/") {
        if (verifyResult) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return nextWithClientMeta(request);
    }

    if (!accessToken || !verifyResult) {
        if (pathname.startsWith("/api")) {
            return unauthorizedResponse();
        }
        return redirectToLogin(request);
    }

    const userInfoHeader = Buffer.from(
        JSON.stringify({
            userId: verifyResult.userId,
            email: verifyResult.email,
            phoneNumber: verifyResult.phoneNumber,
        }),
        "utf8",
    ).toString("base64");

    return nextWithClientMeta(request, {
        "x-user-info": userInfoHeader,
    });
}

export const config = {
    matcher: ["/((?!api/auth|public|_next|favicon|robots.txt|sitemap.xml|images|static).*)"],
};
