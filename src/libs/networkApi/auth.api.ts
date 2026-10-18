import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";

export interface AuthLoginRequest {
    email: string;
    password: string;
}

export interface AuthMeData {
    userId: string;
    email: string | null;
    phoneNumber: string | null;
    fullName: string | null;
    avatarUrl: string | null;
}

export interface AuthLoginData {
    userId: string;
    fullName?: string | null;
    email?: string | null;
}

export const authLogin = async (request: AuthLoginRequest) => {
    return fetcherBackEnd<ApiResponse<AuthLoginData>>("/auth/login", {
        method: "POST",
        body: request,
    });
};

export const authMe = async () => {
    return fetcherBackEnd<ApiResponse<AuthMeData>>("/auth/me", {
        method: "GET",
        // Thunk fetchAuthMe tự xử lý retry + redirect sau khi thất bại đủ số lần
        skipAuthRedirect: true,
    });
};

export const authLogout = async () => {
    return fetcherBackEnd("/auth/logout", {
        method: "POST",
    });
};
