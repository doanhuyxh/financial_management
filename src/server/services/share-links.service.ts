import { createHash, randomBytes } from "crypto";
import mongoose from "mongoose";
import type { NextResponse } from "next/server";
import dbConnect from "@/server/connectDb";
import ShareLinksModel, { type IShareLink } from "@/server/models/share-links.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import {
    DEFAULT_SHARE_LINK_EXPIRY_DAYS,
    SHARE_LINK_EXPIRY_OPTIONS,
    type IFromShareLinkData,
} from "@/libs/interfaces/shareLinksData";
import type {
    IPublicShareInfo,
    ISourceTransactionQuery,
} from "@/libs/interfaces/sourceTransactionsData";
import type { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import {
    errorResponseWithStatusCode,
    noStore,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { normalizeDay } from "../utils/dayRange";
import {
    buildPagination,
    normalizeTransactionQuery,
    querySourceTransactions,
} from "./source-transactions.service";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const LABEL_MAX_LENGTH = 100;
const NOT_FOUND_MESSAGE = "Link không tồn tại hoặc đã hết hạn";
const DAY_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

/** Bỏ tokenHash/userId trước khi trả về client. */
function toShareLinkData(link: IShareLink) {
    return {
        _id: String(link._id),
        sourceOfMoneyId: String(link.sourceOfMoneyId),
        label: link.label ?? "",
        from: link.from ?? null,
        to: link.to ?? null,
        expiresAt: link.expiresAt ?? null,
        isExpired: Boolean(link.expiresAt && link.expiresAt.getTime() <= Date.now()),
        viewCount: link.viewCount ?? 0,
        lastViewedAt: link.lastViewedAt ?? null,
        createdAt: link.createdAt,
    };
}

/** Response public: không cache, không gửi URL (chứa token) qua Referer. */
function publicResponse<T extends NextResponse>(response: T): T {
    response.headers.set("Referrer-Policy", "no-referrer");
    return noStore(response);
}

/**
 * Tìm link còn hiệu lực theo token. `userId` của API public lấy từ đây (không từ JWT/body).
 * Sai token, hết hạn, đã thu hồi hay nguồn đã xóa hẳn đều trả null như nhau.
 */
async function resolveShareLink(token: string) {
    if (!TOKEN_PATTERN.test(token)) return null;
    const link = await ShareLinksModel.findOne({
        tokenHash: hashToken(token),
        revokedAt: null,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).lean<IShareLink>();
    if (!link) return null;

    const source = await SourcesOfMoneyModel.findOne({
        _id: link.sourceOfMoneyId,
        userId: link.userId,
    })
        .select("name type")
        .lean<{ name: string; type: SourcesOfMoneyType }>();
    if (!source) return null;

    return { link, source };
}

export class ShareLinksService {
    static async getShareLinks(sourceId: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();
        if (!mongoose.isValidObjectId(sourceId)) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }

        const links = await ShareLinksModel.find({
            userId: user.userId,
            sourceOfMoneyId: sourceId,
            revokedAt: null,
        })
            .sort({ createdAt: -1 })
            .lean<IShareLink[]>();

        return successResponse(links.map(toShareLinkData));
    }

    static async createShareLink(sourceId: string, data: IFromShareLinkData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();
        if (!mongoose.isValidObjectId(sourceId)) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }

        const source = await SourcesOfMoneyModel.exists({ _id: sourceId, userId: user.userId });
        if (!source) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }

        const expiresInDays =
            data?.expiresInDays === undefined ? DEFAULT_SHARE_LINK_EXPIRY_DAYS : data.expiresInDays;
        if (!SHARE_LINK_EXPIRY_OPTIONS.some((option) => option.value === expiresInDays)) {
            return errorResponseWithStatusCode("Hạn dùng không hợp lệ", 400);
        }

        const label = typeof data?.label === "string" ? data.label.trim() : "";
        if (label.length > LABEL_MAX_LENGTH) {
            return errorResponseWithStatusCode(
                `Tên link tối đa ${LABEL_MAX_LENGTH} ký tự`,
                400,
            );
        }

        const from = normalizeDay(data?.from) ?? null;
        const to = normalizeDay(data?.to) ?? null;
        if (from && to && from > to) {
            return errorResponseWithStatusCode("Khoảng ngày không hợp lệ", 400);
        }

        const token = randomBytes(32).toString("base64url");
        const created = await ShareLinksModel.create({
            userId: user.userId,
            sourceOfMoneyId: sourceId,
            tokenHash: hashToken(token),
            label,
            from,
            to,
            expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * DAY_MS) : null,
        });

        return successResponse(
            { ...toShareLinkData(created), token },
            "Tạo link chia sẻ thành công",
        );
    }

    static async revokeShareLink(shareId: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();
        if (!mongoose.isValidObjectId(shareId)) {
            return errorResponseWithStatusCode("Không tìm thấy link chia sẻ", 404);
        }

        const revoked = await ShareLinksModel.findOneAndUpdate(
            { _id: shareId, userId: user.userId, revokedAt: null },
            { $set: { revokedAt: new Date() } },
        );
        if (!revoked) {
            return errorResponseWithStatusCode("Không tìm thấy link chia sẻ", 404);
        }

        return successResponse(null, "Đã thu hồi link chia sẻ");
    }

    static async getPublicShareInfo(token: string) {
        await dbConnect();
        const resolved = await resolveShareLink(token);
        if (!resolved) {
            return publicResponse(errorResponseWithStatusCode(NOT_FOUND_MESSAGE, 404));
        }
        const { link, source } = resolved;

        await ShareLinksModel.updateOne(
            { _id: link._id },
            { $inc: { viewCount: 1 }, $set: { lastViewedAt: new Date() } },
        );

        const info: IPublicShareInfo = {
            sourceName: source.name,
            sourceType: source.type,
            from: link.from ?? null,
            to: link.to ?? null,
            expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
        };
        return publicResponse(successResponse(info));
    }

    static async getPublicShareTransactions(token: string, query: ISourceTransactionQuery) {
        await dbConnect();
        const resolved = await resolveShareLink(token);
        if (!resolved) {
            return publicResponse(errorResponseWithStatusCode(NOT_FOUND_MESSAGE, 404));
        }
        const { link, source } = resolved;

        // Link public không lọc theo loại (không hiển thị loại giao dịch)
        const { page, limit, from, to } = normalizeTransactionQuery({ ...query, kind: undefined });
        // Kẹp khoảng ngày người xem chọn vào khoảng ngày của link (so sánh chuỗi YYYY-MM-DD)
        const effectiveFrom = [link.from, from].filter(Boolean).sort().pop() ?? undefined;
        const effectiveTo = [link.to, to].filter(Boolean).sort().shift() ?? undefined;

        const { items, total } = await querySourceTransactions({
            userId: String(link.userId),
            sourceId: String(link.sourceOfMoneyId),
            sourceType: source.type,
            page,
            limit,
            from: effectiveFrom as string | undefined,
            to: effectiveTo as string | undefined,
            internal: false,
        });

        return publicResponse(
            successResponse({ items, pagination: buildPagination(total, page, limit) }),
        );
    }
}
