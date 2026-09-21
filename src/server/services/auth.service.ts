import dbConnect from "@/server/connectDb";
import { unauthorizedResponse, successResponseWithSetCookie } from "@/server/utils/responseServer";
import UserModel from "@/server/models/users.model";
import { generateJwtToken } from "@/server/utils/jwtUtil";
import { configCookieKey } from "@/libs/constants/configKey";


function authUserPayload(
    user: {
        _id: { toString(): string };
        fullName?: string | null;
        email?: string | null;
    },
    accessToken: string,
) {
    return {
        userId: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        accessToken,
    };
}

export async function login(email: string, password: string) {
    await dbConnect();
    const user = await UserModel.findOne({ email }).lean().select(
        [
            '_id',
            'fullName',
            'email',
            'password',
            'avatarUrl',
            "phoneNumber"
        ]
    );
    if (!user) {
        return unauthorizedResponse("Email hoặc mật khẩu không đúng");
    }
    const isMatch = user["password"] === password;
    if (!isMatch) {
        return unauthorizedResponse("Email hoặc mật khẩu không đúng");
    }

    const token = await generateJwtToken({
        userId: user._id.toString() || "",
        email: user.email ?? null,
        phoneNumber: user.phoneNumber ?? null,
        fullName: user.fullName || null,
        avatarUrl: user.avatarUrl || null,
    });

    return successResponseWithSetCookie(
        authUserPayload(user, token),
        "Đăng nhập thành công",
        {
            name: configCookieKey.ACCESS_TOKEN_KEY,
            value: token,
            options: { httpOnly: true, secure: true, sameSite: "Strict" },
        },
    );
}
