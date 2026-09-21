import { NextResponse } from "next/server";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";

export function successResponse<T>(data: T, message = "") {
    const response: ApiResponse<T> = {
        status: true,
        message,
        data,
        statusCode: 200,
    };
    return NextResponse.json(response, { status: 200 });
}

export function errorResponseWithStatusCode(message = "Something went wrong", statusCode = 500) {
    const response: ApiResponse<null> = {
        status: false,
        message,
        data: null,
        statusCode,
    };
    return NextResponse.json(response, { status: statusCode });
}

export function successResponsePageNation<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
    message = "",
) {
    return NextResponse.json({
        status: true,
        statusCode: 200,
        data: {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
        message,
    });
}

export function successResponseWithSetCookie(
    data: any = null,
    message = "",
    cookieOptions: {
        name: string;
        value: string;
        options?: Record<string, any>;
    },
) {
    const response: ApiResponse<any> = {
        status: true,
        message,
        data,
        statusCode: 200,
    };
    const { name, value, options } = cookieOptions;
    const headers = new Headers();
    const ONE_YEAR = 60 * 60 * 24 * 365;
    headers.append(
        "Set-Cookie",
        `${name}=${value}; Path=/; HttpOnly; ${options?.secure ? "Secure;" : ""} ${options?.sameSite ? `SameSite=${options.sameSite};` : ""} Max-Age=${ONE_YEAR};`,
    );
    return NextResponse.json(response, { status: 200, headers });
}

export function successResponseSetCookieRedirect(request: Request, url: string, cookieOptions: { name: string; value: string; options?: Record<string, any>; }) {
    const { name, value, options } = cookieOptions;
    const response = NextResponse.redirect(
        new URL(url, request.url)
    );
    response.cookies.set({
        name,
        value,
        httpOnly: true,
        path: "/",
        secure: options?.secure ?? false,
        sameSite: options?.sameSite ?? "lax",
        maxAge: 60 * 60 * 24 * 365,
    });

    return response;
}

export function unauthorizedResponse(
    message = "Bạn chưa đăng nhập hoặc phiên đã hết hạn.",
) {
    const response: ApiResponse<null> = {
        status: false,
        message,
        data: null,
        statusCode: 401,
    };
    return NextResponse.json(response, { status: 401 });
}