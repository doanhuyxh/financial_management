import { NextResponse, type NextRequest } from "next/server";
import { clearAccessTokenCookie, unauthorizedResponse } from "@/server/utils/responseServer";
import { verifyAccessToken } from "@/server/utils/jwtUtil";
import { validateAccessToken } from "@/server/utils/getCurrentUser";
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

function redirectToLogin(request: NextRequest, hadToken: boolean) {
    const url = request.nextUrl.clone();
    const returnUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("returnUrl", returnUrl);
    const response = NextResponse.redirect(url);
    // Best-effort: trình duyệt điện thoại có lúc không xóa được cookie, nên không dựa vào bước này.
    // Trang "/" luôn kiểm tra token đầy đủ nên cookie cũ còn sót cũng không gây vòng lặp.
    // Không có token thì không gửi lệnh xóa: tránh xóa nhầm cookie vừa được login set (race trên iOS).
    return hadToken ? clearAccessTokenCookie(response) : response;
}

/**
 * Trang (không phải /api): kiểm tra đầy đủ cả tokenVersion trong DB, để token đã bị thu hồi
 * bị đá về đăng nhập ngay thay vì vào dashboard rồi kẹt ở 401.
 * /api: chỉ kiểm tra chữ ký, vì service đã gọi getCurrentUser (tránh query DB 2 lần).
 * DB lỗi tạm thời: rơi về kết quả kiểm tra chữ ký, không đá user ra vì sự cố server.
 */
async function resolveAccessToken(accessToken: string, fullCheck: boolean) {
    const verifyResult = accessToken ? await verifyAccessToken(accessToken) : null;
    if (!verifyResult || !fullCheck) return verifyResult;
    try {
        return await validateAccessToken(accessToken);
    } catch (error) {
        console.error("Proxy: failed to validate access token", error);
        return verifyResult;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const accessToken = await getValueCookieServer(configCookieKey.ACCESS_TOKEN_KEY);
    const verifyResult = await resolveAccessToken(accessToken, !pathname.startsWith("/api"));

    if (pathname === "/") {
        if (verifyResult) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return nextWithClientMeta(request);
    }

    if (!accessToken || !verifyResult) {
        if (pathname.startsWith("/api")) {
            const response = unauthorizedResponse();
            return accessToken ? clearAccessTokenCookie(response) : response;
        }
        return redirectToLogin(request, !!accessToken);
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
    // api/public/ và share/: link chia sẻ lịch sử nguồn tiền, xem không cần đăng nhập
    matcher: [
        "/((?!api/auth|api/public/|share/|public|_next|favicon|robots.txt|sitemap.xml|images|static).*)",
    ],
};
