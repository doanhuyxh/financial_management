import mongoose from "mongoose";
import TransactionAuditsModel from "@/server/models/transaction-audits.model";
import {
    TransactionAuditAction,
    type ITransactionAuditSnapshot,
    type TransactionAuditKind,
} from "@/libs/interfaces/transactionAuditsData";
import { getAuthContext } from "./authContext";

/** Trường ngày giao dịch của từng loại, ghi vào snapshot dưới tên `date`. */
const DATE_FIELDS = ["spentAt", "receivedAt", "transferredAt", "rolledAt"] as const;
const ID_FIELDS = ["categoryId", "sourceOfMoneyId", "fromSourceId", "toSourceId"] as const;
const NUMBER_FIELDS = ["amount", "feeAmount", "paymentAmount"] as const;
const STRING_FIELDS = ["note", "cardFeeType", "provider"] as const;

function toIdString(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof mongoose.Types.ObjectId) return value.toString();
    if (typeof value === "string") return value;
    // Document đã populate
    const id = (value as { _id?: unknown })._id;
    return id ? String(id) : undefined;
}

/** Lấy các trường nghiệp vụ của một giao dịch (document hoặc lean) để lưu lịch sử. */
export function toAuditSnapshot(doc: unknown): ITransactionAuditSnapshot {
    const source =
        doc && typeof (doc as { toObject?: unknown }).toObject === "function"
            ? (doc as { toObject: () => Record<string, unknown> }).toObject()
            : ((doc ?? {}) as Record<string, unknown>);
    const snapshot: ITransactionAuditSnapshot = {};

    for (const field of NUMBER_FIELDS) {
        if (typeof source[field] === "number") snapshot[field] = source[field] as number;
    }
    for (const field of STRING_FIELDS) {
        if (typeof source[field] === "string" && source[field]) {
            snapshot[field] = source[field] as string;
        }
    }
    for (const field of ID_FIELDS) {
        const id = toIdString(source[field]);
        if (id) snapshot[field] = id;
    }
    for (const field of DATE_FIELDS) {
        const value = source[field];
        if (value instanceof Date) {
            snapshot.date = value.toISOString();
            break;
        }
    }
    return snapshot;
}

/**
 * Ghi một dòng lịch sử sau khi sửa/xóa thành công. Không bao giờ throw: lỗi chỉ `console.warn`,
 * vì thao tác chính đã xong và số dư đã đúng. Request MCP thì ghi kèm `via: "mcp"` + `tokenId`.
 */
export async function recordTransactionAudit(entry: {
    userId: string;
    kind: TransactionAuditKind;
    refId: string | mongoose.Types.ObjectId;
    action: TransactionAuditAction;
    /** Bỏ trống khi tạo */
    before?: unknown;
    after?: unknown;
}) {
    const auth = getAuthContext();
    try {
        await TransactionAuditsModel.create({
            userId: new mongoose.Types.ObjectId(entry.userId),
            kind: entry.kind,
            refId: new mongoose.Types.ObjectId(String(entry.refId)),
            action: entry.action,
            before: entry.before ? toAuditSnapshot(entry.before) : {},
            after: entry.after ? toAuditSnapshot(entry.after) : null,
            via: auth?.via ?? "web",
            tokenId:
                auth?.tokenId && mongoose.isValidObjectId(auth.tokenId)
                    ? new mongoose.Types.ObjectId(auth.tokenId)
                    : null,
        });
    } catch (error) {
        console.warn("[transaction-audit] Không ghi được lịch sử", entry.kind, entry.action, error);
    }
}

/**
 * Giao dịch tạo qua agent (MCP) thì ghi một dòng "Tạo" để user thấy agent đã ghi gì.
 * Tạo trên web không ghi (đã thấy ngay trên giao diện).
 */
export async function recordAgentCreateAudit(entry: {
    userId: string;
    kind: TransactionAuditKind;
    created: unknown;
}) {
    if (getAuthContext()?.via !== "mcp") return;
    const refId = (entry.created as { _id?: unknown } | null)?._id;
    if (!refId) return;
    await recordTransactionAudit({
        userId: entry.userId,
        kind: entry.kind,
        refId: String(refId),
        action: TransactionAuditAction.CREATE,
        after: entry.created,
    });
}
