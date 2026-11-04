import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import IntegrityIssuesModel from "@/server/models/integrity-issues.model";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import {
    ReconcileBlockReason,
    type IApplyReconcileData,
    type IBalanceReconcileData,
} from "@/libs/interfaces/balanceReconcileData";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { computeLedgerBalance } from "../utils/ledgerBalance";

type ReconcileSource = {
    _id: mongoose.Types.ObjectId;
    type: SourcesOfMoneyType;
    balance?: number;
    creditDetails?: { creditLimit?: number; currentDebt?: number };
    archivedAt?: Date | null;
    ledgerCompleteAt?: Date | null;
};

export class ReconcileConflictError extends Error {}

function trackedPath(type: SourcesOfMoneyType) {
    return type === SourcesOfMoneyType.CREDIT_CARD ? "creditDetails.currentDebt" : "balance";
}

/** Số theo sổ có hợp lệ để ghi vào số lưu không: nguồn thường ≥ 0, thẻ 0..hạn mức, số nguyên. */
function isLedgerInRange(source: ReconcileSource, ledger: number) {
    if (!Number.isInteger(ledger) || ledger < 0) return false;
    if (source.type === SourcesOfMoneyType.CREDIT_CARD) {
        return ledger <= (source.creditDetails?.creditLimit ?? 0);
    }
    return true;
}

/**
 * So số dư/dư nợ đang lưu với sổ cái. Dùng chung cho API (modal lịch sử) và
 * `scripts/reconcile-balances.ts`.
 */
export async function inspectSourceBalance(
    userId: string | mongoose.Types.ObjectId,
    source: ReconcileSource,
): Promise<IBalanceReconcileData> {
    const [{ ledger }, openIssues] = await Promise.all([
        computeLedgerBalance(userId, source._id, source.type),
        IntegrityIssuesModel.countDocuments({ userId, sourceOfMoneyId: source._id, resolvedAt: null }),
    ]);
    const stored = getTrackedAmount(source);
    const diff = stored - ledger;
    const ledgerComplete = Boolean(source.ledgerCompleteAt);

    let blockReason: ReconcileBlockReason | undefined;
    if (source.archivedAt) blockReason = ReconcileBlockReason.ARCHIVED;
    else if (!ledgerComplete) blockReason = ReconcileBlockReason.LEDGER_INCOMPLETE;
    else if (!isLedgerInRange(source, ledger)) blockReason = ReconcileBlockReason.LEDGER_OUT_OF_RANGE;

    return {
        sourceId: source._id.toString(),
        sourceType: source.type,
        stored,
        ledger,
        diff,
        ledgerComplete,
        canApply: diff !== 0 && !blockReason,
        ...(blockReason ? { blockReason } : {}),
        openIssues,
    };
}

/**
 * Sửa số lưu về đúng sổ cái (sổ cái là sự thật, không ghi thêm BalanceAdjustment cho phần lệch).
 * Chỉ ghi khi số lưu và số theo sổ vẫn bằng số người dùng đã xem — tránh ghi đè giao dịch
 * đang chạy giữa chừng. Ghi một IntegrityIssue đã xử lý làm vết và đóng các issue cũ của nguồn.
 */
export async function applySourceReconcile(
    userId: string | mongoose.Types.ObjectId,
    sourceId: string | mongoose.Types.ObjectId,
    expected: IApplyReconcileData,
) {
    const source = await SourcesOfMoneyModel.findOne({ _id: sourceId, userId }).lean<ReconcileSource>();
    if (!source) throw new Error("Không tìm thấy nguồn tiền");

    const current = await inspectSourceBalance(userId, source);
    if (current.stored !== expected.expectedStored || current.ledger !== expected.expectedLedger) {
        throw new ReconcileConflictError(
            "Số dư hoặc giao dịch vừa thay đổi. Hãy kiểm tra lại số mới rồi đối soát lại",
        );
    }
    if (current.diff === 0) return current;
    if (!current.canApply) {
        throw new Error(
            current.blockReason === ReconcileBlockReason.LEDGER_INCOMPLETE
                ? "Nguồn tạo trước khi có sổ cái đầy đủ, chưa sửa tự động được"
                : current.blockReason === ReconcileBlockReason.ARCHIVED
                  ? "Nguồn tiền đã bị xóa"
                  : "Số theo sổ âm hoặc vượt hạn mức, cần kiểm tra lại giao dịch",
        );
    }

    const path = trackedPath(source.type);
    const updated = await SourcesOfMoneyModel.findOneAndUpdate(
        {
            _id: source._id,
            userId,
            type: source.type,
            archivedAt: null,
            ledgerCompleteAt: { $ne: null },
            // Thẻ cũ thiếu currentDebt được coi là 0
            [path]: current.stored === 0 ? { $in: [0, null] } : current.stored,
        },
        { $set: { [path]: current.ledger } },
        { returnDocument: "after" },
    );
    if (!updated) {
        throw new ReconcileConflictError("Số dư vừa thay đổi do giao dịch khác. Hãy thử lại");
    }

    const now = new Date();
    await IntegrityIssuesModel.updateMany(
        { userId, sourceOfMoneyId: source._id, resolvedAt: null },
        { $set: { resolvedAt: now } },
    );
    await IntegrityIssuesModel.create({
        userId,
        sourceOfMoneyId: source._id,
        operation: "reconcile",
        step: "set-to-ledger",
        amount: -current.diff,
        originalError: `Số lưu ${current.stored} khác sổ cái ${current.ledger}`,
        resolvedAt: now,
    });

    return { ...current, stored: current.ledger, diff: 0, canApply: false, openIssues: 0 };
}

export class BalanceReconcileService {
    static async getReconcile(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        if (!mongoose.isValidObjectId(id)) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }
        const source = await SourcesOfMoneyModel.findOne({ _id: id, userId: user.userId })
            .lean<ReconcileSource>();
        if (!source) return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);

        return successResponse(await inspectSourceBalance(user.userId, source));
    }

    static async applyReconcile(id: string, data: Partial<IApplyReconcileData>) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        if (!mongoose.isValidObjectId(id)) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }
        const expectedStored = Number(data?.expectedStored);
        const expectedLedger = Number(data?.expectedLedger);
        if (!Number.isFinite(expectedStored) || !Number.isFinite(expectedLedger)) {
            return errorResponseWithStatusCode("Thiếu số dư đã xem để đối soát", 400);
        }

        try {
            const result = await applySourceReconcile(user.userId, id, {
                expectedStored,
                expectedLedger,
            });
            return successResponse(result, "Đã sửa số dư về theo sổ");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Đối soát thất bại";
            const status =
                error instanceof ReconcileConflictError
                    ? 409
                    : message === "Không tìm thấy nguồn tiền"
                      ? 404
                      : 400;
            return errorResponseWithStatusCode(message, status);
        }
    }
}
