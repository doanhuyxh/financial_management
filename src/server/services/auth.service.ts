import bcrypt from "bcryptjs";
import dbConnect from "@/server/connectDb";
import {
    errorResponseWithStatusCode,
    noStore,
    unauthorizedResponse,
    successResponseWithSetCookie,
} from "@/server/utils/responseServer";
import UserModel from "@/server/models/users.model";
import LoginAttemptModel from "@/server/models/login-attempt.model";
import { generateJwtToken } from "@/server/utils/jwtUtil";
import { configCookieKey } from "@/libs/constants/configKey";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function authUserPayload(user: {
    _id: { toString(): string };
    fullName?: string | null;
    email?: string | null;
}) {
    return {
        userId: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
    };
}

function attemptKey(ip: string, email: string) {
    return `${ip || "unknown"}|${email.trim().toLowerCase()}`;
}

function isBcryptHash(value: string) {
    return /^\$2[aby]\$/.test(value);
}

async function lockedResponse(key: string) {
    const attempt = await LoginAttemptModel.findOne({ key }).select("lockedUntil").lean();
    const lockedUntil = attempt?.lockedUntil ? new Date(attempt.lockedUntil).getTime() : 0;
    if (lockedUntil > Date.now()) {
        return noStore(
            errorResponseWithStatusCode(
                "Đăng nhập bị tạm khóa 15 phút do nhập sai quá nhiều lần.",
                429,
            ),
        );
    }
    return null;
}

async function recordLoginFailure(key: string) {
    const attempt = await LoginAttemptModel.findOneAndUpdate(
        { key },
        { $inc: { failCount: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if ((attempt?.failCount ?? 0) >= MAX_LOGIN_ATTEMPTS) {
        await LoginAttemptModel.updateOne(
            { key },
            { $set: { failCount: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } },
        );
    }
}

export async function login(email: string, password: string, ip: string) {
    await dbConnect();
    const key = attemptKey(ip, email);
    const locked = await lockedResponse(key);
    if (locked) return locked;

    const user = await UserModel.findOne({ email }).select(
        [
            "_id",
            "fullName",
            "email",
            "password",
            "avatarUrl",
            "phoneNumber",
            "tokenVersion",
        ],
    );
    const storedPassword = String(user?.password ?? "");
    const passwordMatches = user
        ? isBcryptHash(storedPassword)
            ? await bcrypt.compare(password, storedPassword)
            : storedPassword === password
        : false;

    if (!user || !passwordMatches) {
        await recordLoginFailure(key);
        return noStore(unauthorizedResponse("Email hoặc mật khẩu không đúng"));
    }

    if (!isBcryptHash(storedPassword)) {
        user.password = await bcrypt.hash(password, 12);
        await user.save();
    }

    await LoginAttemptModel.deleteOne({ key });

    const token = await generateJwtToken({
        userId: user._id.toString() || "",
        email: user.email ?? null,
        phoneNumber: user.phoneNumber ?? null,
        fullName: user.fullName || null,
        avatarUrl: user.avatarUrl || null,
        tokenVersion: user.tokenVersion ?? 0,
    });

    return successResponseWithSetCookie(
        authUserPayload(user),
        "Đăng nhập thành công",
        {
            name: configCookieKey.ACCESS_TOKEN_KEY,
            value: token,
            options: { httpOnly: true, secure: true, sameSite: "Strict" },
        },
    );
}
