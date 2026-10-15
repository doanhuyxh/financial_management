import { RcFile } from "antd/es/upload";
import { EnvsConfig } from "./constants/configKey";
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface FetchOptions {
    method?: Method;
    body?: any;
    headers?: Record<string, string>;
    cache?: RequestCache;
}

export async function fetcherBackEnd<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    try {
        const url = `${EnvsConfig.BACK_END_BASE_URL}${endpoint}`;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...options.headers,
        };

        const res = await fetch(url, {
            method: options.method || "GET",
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            credentials: "include",
            cache: options.cache || "no-store",
        });
        const jsonData = await res.json().catch(() => ({
            status: false,
            message: "An unexpected error occurred",
            data: null,
            statusCode: res.status,
        }));
        if (!res.ok) {
            if (
                res.status === 401 &&
                typeof window !== "undefined" &&
                window.location.pathname !== "/"
            ) {
                const returnUrl = encodeURIComponent(
                    window.location.pathname + window.location.search,
                );
                window.location.replace(`/?returnUrl=${returnUrl}`);
            }
            return Promise.reject(jsonData);
        }
        return jsonData;
    } catch (error: any) {
        return Promise.reject({
            status: false,
            message: error.message || "An unexpected error occurred",
            data: null,
            statusCode: error.statusCode || 500,
        } as T);
    }
}

export async function uploadFileServer(file: RcFile): Promise<any> {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads", {
            method: "POST",
            body: formData,
        });
        const data = await response.json();
        return data;
    } catch {
        return null;
    }
}
