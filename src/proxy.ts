import { NextResponse, type NextRequest } from 'next/server';
import { unauthorizedResponse } from '@/server/utils/responseServer';
import { verifyAccessToken } from '@/server/utils/jwtUtil.edge';
import { configCookieKey } from '@/libs/constants/configKey';
import getValueCookieServer from '@/libs/utils/getValueCookieServer';

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0]?.trim() || '';
    }
    return (
        request.headers.get('x-real-ip')?.trim() ||
        request.headers.get('cf-connecting-ip')?.trim() ||
        ''
    );
}

function nextWithClientMeta(
    request: NextRequest,
    extraHeaders?: Record<string, string>,
): NextResponse {
    const requestHeaders = new Headers(request.headers);
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent')?.trim() || '';

    if (ip) {
        requestHeaders.set('x-client-ip', ip);
    }
    if (userAgent) {
        requestHeaders.set('x-user-agent', userAgent);
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

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (
        pathname === "/"
    ) {
        return nextWithClientMeta(request);
    }

    const accessToken = await getValueCookieServer(configCookieKey.ACCESS_TOKEN_KEY);
    if (!accessToken) {
        if (pathname.startsWith("/api")) {
            return unauthorizedResponse();
        }
        const url = request.nextUrl.clone();
        const returnUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
        url.pathname = "/";
        url.search = "";
        url.searchParams.set("returnUrl", returnUrl);
        return NextResponse.redirect(url);
    }
    const verifyResult = await verifyAccessToken(accessToken);
    if (!verifyResult) {
        if (pathname.startsWith("/api")) {
            return unauthorizedResponse();
        }
        const url = request.nextUrl.clone();
        const returnUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
        url.pathname = "/";
        url.search = "";
        url.searchParams.set("returnUrl", returnUrl);
        return NextResponse.redirect(url);
    }

    const userInfoHeader = Buffer.from(JSON.stringify({
        userId: verifyResult.userId,
        email: verifyResult.email,
        phoneNumber: verifyResult.phoneNumber,
    }), 'utf8').toString('base64');

    return nextWithClientMeta(request, {
        'x-user-info': userInfoHeader,
    });
}


export const config = {
    matcher: [
        "/((?!api/auth|public|_next|favicon|robots.txt|sitemap.xml|images|static).*)",
    ],
};