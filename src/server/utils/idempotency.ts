import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import dbConnect from "@/server/connectDb";
import IdempotencyKeysModel, { IdempotencyStatus } from "@/server/models/idempotency-keys.model";
import { getCurrentUser } from "./getCurrentUser";
import { errorResponseWithStatusCode } from "./responseServer";

export const IDEMPOTENCY_HEADER = "idempotency-key";
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
/** Bản ghi PENDING quá lâu (tiến trình chết giữa chừng) thì coi như bỏ, cho chạy lại */
const STALE_PENDING_MS = 2 * 60 * 1000;

function hashBody(body: unknown) {
    return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}

function isDuplicateKeyError(error: unknown) {
    return Boolean(error && typeof error === "object" && (error as { code?: number }).code === 11000);
}

/**
 * Chống tạo trùng giao dịch khi client gửi lại cùng một yêu cầu (bấm đúp, mạng chập chờn).
 * Không có header thì chạy bình thường. Có header:
 * - lần đầu: giữ chỗ (PENDING), chạy `handler`; thành công thì lưu response, lỗi thì xóa khóa
 *   để người dùng sửa và gửi lại cùng khóa;
 * - lần sau: trả lại đúng response đã lưu (header `Idempotent-Replayed: true`);
 * - đang chạy: 409; cùng khóa nhưng body khác: 422.
 */
export async function withIdempotency(
    request: Request,
    route: string,
    body: unknown,
    handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
    const key = request.headers.get(IDEMPOTENCY_HEADER)?.trim();
    if (!key) return handler();
    if (!KEY_PATTERN.test(key)) {
        return errorResponseWithStatusCode("Idempotency-Key không hợp lệ", 400);
    }

    await dbConnect();
    const user = await getCurrentUser();
    // Chưa đăng nhập: để handler trả 401 như thường
    if (!user?.userId) return handler();

    const bodyHash = hashBody(body);
    const owner = { userId: user.userId, key };

    try {
        await IdempotencyKeysModel.create({ ...owner, route, bodyHash });
    } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;

        const existing = await IdempotencyKeysModel.findOne(owner).lean<{
            route: string;
            bodyHash: string;
            status: IdempotencyStatus;
            responseStatus?: number;
            responseBody?: unknown;
            createdAt: Date;
        }>();
        if (!existing) return withIdempotency(request, route, body, handler);
        if (existing.route !== route || existing.bodyHash !== bodyHash) {
            return errorResponseWithStatusCode(
                "Idempotency-Key đã dùng cho một yêu cầu khác",
                422,
            );
        }
        if (existing.status === IdempotencyStatus.DONE) {
            return NextResponse.json(existing.responseBody, {
                status: existing.responseStatus ?? 200,
                headers: { "Idempotent-Replayed": "true" },
            });
        }
        if (Date.now() - new Date(existing.createdAt).getTime() > STALE_PENDING_MS) {
            await IdempotencyKeysModel.deleteOne({ ...owner, status: IdempotencyStatus.PENDING });
            return withIdempotency(request, route, body, handler);
        }
        return errorResponseWithStatusCode("Yêu cầu này đang được xử lý, vui lòng đợi", 409);
    }

    let response: NextResponse;
    try {
        response = await handler();
    } catch (error) {
        await IdempotencyKeysModel.deleteOne(owner).catch(() => undefined);
        throw error;
    }

    if (response.ok) {
        const responseBody = await response.clone().json().catch(() => null);
        await IdempotencyKeysModel.updateOne(owner, {
            $set: {
                status: IdempotencyStatus.DONE,
                responseStatus: response.status,
                responseBody,
            },
        }).catch((error) => console.error("[idempotency] Không lưu được response", error));
    } else {
        await IdempotencyKeysModel.deleteOne(owner).catch(() => undefined);
    }
    return response;
}
