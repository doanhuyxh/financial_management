import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";

export interface AuthLoginRequest {
    email: string;
    password: string;
}

export const authLogin = async (request: AuthLoginRequest) => {
    return fetcherBackEnd("/auth/login", {
        method: "POST",
        body: request,
    });
};

export const authLogout = async () => {
    return fetcherBackEnd("/auth/logout", {
        method: "GET",
    });
};