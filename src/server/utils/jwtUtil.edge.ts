import { EnvsConfig } from "@/libs/constants/configKey";

interface JwtPayload {
    userId: string;
    email: string | null;
    phoneNumber: string | null;
    roles: string[];
    iat?: number;
    exp?: number;
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
    try {
        const [encodedHeader, encodedPayload, signature] = token.split(".");
        if (!encodedHeader || !encodedPayload || !signature) return null;

        const encoder = new TextEncoder();
        const cryptoKey = await globalThis.crypto.subtle.importKey(
            "raw",
            encoder.encode(EnvsConfig.JWT_SECRET!),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );
        const sigBuffer = await globalThis.crypto.subtle.sign(
            "HMAC",
            cryptoKey,
            encoder.encode(`${encodedHeader}.${encodedPayload}`),
        );
        const sigBytes = new Uint8Array(sigBuffer);
        let binary = "";
        for (let i = 0; i < sigBytes.length; i++) {
            binary += String.fromCharCode(sigBytes[i]);
        }
        const expectedSignature = btoa(binary)
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
        if (expectedSignature.length !== signature.length) return null;
        let diff = 0;
        for (let i = 0; i < expectedSignature.length; i++) {
            diff |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
        }
        if (diff !== 0) return null;
        const padded = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
        const payload = JSON.parse(jsonStr) as JwtPayload;

        const now = Math.floor(Date.now() / 1000);
        if (!payload.exp || payload.exp < now) return null;

        return payload;
    } catch {
        return null;
    }
}