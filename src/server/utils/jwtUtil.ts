import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { EnvsConfig } from "@/libs/constants/configKey";

export interface JwtPayload extends JWTPayload {
    userId: string;
    email: string | null;
    phoneNumber: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
}

const secret = new TextEncoder().encode(EnvsConfig.JWT_SECRET!);

export async function generateJwtToken(payload: JwtPayload): Promise<string> {
    const cleanPayload = {
        userId: String(payload.userId),
        email: payload.email ?? null,
        phoneNumber: payload.phoneNumber ?? null,
        fullName: payload.fullName ?? null,
        avatarUrl: payload.avatarUrl ?? null,
    };
    return await new SignJWT(cleanPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("365d")
        .sign(secret);
}


export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as JwtPayload;
    } catch {
        return null;
    }
}

export async function getUserInfoFromToken(token: string): Promise<JwtPayload | null> {
    const payload = await verifyAccessToken(token);
    if (!payload) return null;

    return {
        userId: payload.userId,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        fullName: payload.fullName || null,
        avatarUrl: payload.avatarUrl || null,
    };
}