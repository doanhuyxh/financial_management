import type { Types } from "mongoose";
import dbConnect from "@/server/connectDb";
import ExpensesModel from "@/server/models/expenses.model";
import IncomesModel from "@/server/models/incomes.model";
import TransfersModel from "@/server/models/transfers.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import type {
    ITransactionSuggestions,
    ITransferSuggestions,
} from "@/libs/interfaces/suggestionsData";
import { successResponse, unauthorizedResponse } from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Chỉ xét giao dịch trong khoảng này. */
const LOOKBACK_DAYS = 90;
/** Hằng số suy giảm: giao dịch cách đây 30 ngày có trọng số ≈ 0.37. */
const DECAY_DAYS = 30;
/** Phải dùng ít nhất từng này lần mới được coi là "thường dùng". */
const MIN_COUNT = 2;

const MAX_CATEGORIES = 5;
const MAX_SOURCES = 3;
const MAX_AMOUNTS = 4;
const MAX_PAIRS = 3;

type ObjectIdLike = Types.ObjectId | string | null | undefined;

type TransactionRecord = {
    categoryId: string;
    sourceId: string;
    amount: number;
    at: Date;
};

type TransferRecord = {
    fromSourceId: string;
    toSourceId: string;
    amount: number;
    at: Date;
};

/** Đếm tần suất có trọng số thời gian cho từng key. */
class Ranker {
    private stats = new Map<string, { score: number; count: number }>();

    add(key: string, weight: number) {
        const current = this.stats.get(key) ?? { score: 0, count: 0 };
        current.score += weight;
        current.count += 1;
        this.stats.set(key, current);
    }

    top(limit: number, minCount = MIN_COUNT): string[] {
        return [...this.stats.entries()]
            .filter(([, stat]) => stat.count >= minCount)
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, limit)
            .map(([key]) => key);
    }
}

function getSince() {
    return new Date(Date.now() - LOOKBACK_DAYS * DAY_MS);
}

function decayWeight(at: Date, now: number) {
    // Giao dịch đặt ngày tương lai được tính như hôm nay
    const ageDays = Math.max(0, (now - new Date(at).getTime()) / DAY_MS);
    return Math.exp(-ageDays / DECAY_DAYS);
}

function topAmounts(ranker: Ranker) {
    return ranker
        .top(MAX_AMOUNTS)
        .map(Number)
        .sort((a, b) => a - b);
}

function toId(value: ObjectIdLike) {
    return value ? String(value) : "";
}

async function getOwnedIds(userId: string) {
    const [categories, sources] = await Promise.all([
        CategoriesModel.find({ userId }).select("_id").lean(),
        SourcesOfMoneyModel.find({ userId }).select("_id").lean(),
    ]);
    return {
        categoryIds: new Set(categories.map((item) => toId(item._id))),
        sourceIds: new Set(sources.map((item) => toId(item._id))),
    };
}

/** Bỏ qua giao dịch có danh mục/nguồn đã bị xóa (mồ côi). */
function rankTransactions(
    records: TransactionRecord[],
    validCategoryIds: Set<string>,
    validSourceIds: Set<string>,
): ITransactionSuggestions {
    const now = Date.now();
    const categoryRanker = new Ranker();
    const sourceRanker = new Ranker();
    const amountRanker = new Ranker();
    const perCategory = new Map<string, { amounts: Ranker; sources: Ranker }>();

    for (const record of records) {
        const hasCategory = validCategoryIds.has(record.categoryId);
        const hasSource = validSourceIds.has(record.sourceId);
        const weight = decayWeight(record.at, now);
        const amountKey = String(record.amount);

        amountRanker.add(amountKey, weight);
        if (hasSource) sourceRanker.add(record.sourceId, weight);
        if (!hasCategory) continue;

        categoryRanker.add(record.categoryId, weight);
        let bucket = perCategory.get(record.categoryId);
        if (!bucket) {
            bucket = { amounts: new Ranker(), sources: new Ranker() };
            perCategory.set(record.categoryId, bucket);
        }
        bucket.amounts.add(amountKey, weight);
        if (hasSource) bucket.sources.add(record.sourceId, weight);
    }

    const byCategory: ITransactionSuggestions["byCategory"] = {};
    for (const [categoryId, bucket] of perCategory) {
        byCategory[categoryId] = {
            amounts: topAmounts(bucket.amounts),
            sourceId: bucket.sources.top(1, 1)[0] ?? null,
        };
    }

    return {
        categoryIds: categoryRanker.top(MAX_CATEGORIES),
        sourceIds: sourceRanker.top(MAX_SOURCES),
        topAmounts: topAmounts(amountRanker),
        byCategory,
    };
}

function rankTransfers(
    records: TransferRecord[],
    validSourceIds: Set<string>,
): ITransferSuggestions {
    const now = Date.now();
    const pairRanker = new Ranker();
    const fromRanker = new Ranker();
    const amountRanker = new Ranker();
    const pairAmounts = new Map<string, Ranker>();

    for (const record of records) {
        const weight = decayWeight(record.at, now);
        const amountKey = String(record.amount);
        amountRanker.add(amountKey, weight);

        if (!validSourceIds.has(record.fromSourceId)) continue;
        fromRanker.add(record.fromSourceId, weight);
        if (!validSourceIds.has(record.toSourceId)) continue;

        const pairKey = `${record.fromSourceId}:${record.toSourceId}`;
        pairRanker.add(pairKey, weight);
        let amounts = pairAmounts.get(pairKey);
        if (!amounts) {
            amounts = new Ranker();
            pairAmounts.set(pairKey, amounts);
        }
        amounts.add(amountKey, weight);
    }

    return {
        pairs: pairRanker.top(MAX_PAIRS).map((pairKey) => {
            const [fromSourceId, toSourceId] = pairKey.split(":");
            return {
                fromSourceId,
                toSourceId,
                amounts: topAmounts(pairAmounts.get(pairKey) ?? new Ranker()),
            };
        }),
        fromSourceIds: fromRanker.top(MAX_SOURCES),
        topAmounts: topAmounts(amountRanker),
    };
}

export class SuggestionsService {
    static async getExpenseSuggestions() {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const [expenses, owned] = await Promise.all([
            ExpensesModel.find({
                userId: user.userId,
                spentAt: { $gte: getSince() },
                // Phí chuyển tiền do hệ thống tự tạo, không phản ánh thói quen chi tiêu
                skipBalanceAdjust: { $ne: true },
            })
                .select("categoryId sourceOfMoneyId amount spentAt")
                .lean(),
            getOwnedIds(user.userId),
        ]);

        const records = expenses.map((item) => ({
            categoryId: toId(item.categoryId),
            sourceId: toId(item.sourceOfMoneyId),
            amount: item.amount,
            at: item.spentAt,
        }));

        return successResponse(
            rankTransactions(records, owned.categoryIds, owned.sourceIds),
            "Lấy gợi ý chi tiêu thành công",
        );
    }

    static async getIncomeSuggestions() {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const [incomes, owned] = await Promise.all([
            IncomesModel.find({
                userId: user.userId,
                receivedAt: { $gte: getSince() },
            })
                .select("categoryId sourceOfMoneyId amount receivedAt")
                .lean(),
            getOwnedIds(user.userId),
        ]);

        const records = incomes.map((item) => ({
            categoryId: toId(item.categoryId),
            sourceId: toId(item.sourceOfMoneyId),
            amount: item.amount,
            at: item.receivedAt,
        }));

        return successResponse(
            rankTransactions(records, owned.categoryIds, owned.sourceIds),
            "Lấy gợi ý thu nhập thành công",
        );
    }

    static async getTransferSuggestions() {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) {
            return unauthorizedResponse();
        }

        const [transfers, owned] = await Promise.all([
            TransfersModel.find({
                userId: user.userId,
                transferredAt: { $gte: getSince() },
            })
                .select("fromSourceId toSourceId amount transferredAt")
                .lean(),
            getOwnedIds(user.userId),
        ]);

        const records = transfers.map((item) => ({
            fromSourceId: toId(item.fromSourceId),
            toSourceId: toId(item.toSourceId),
            amount: item.amount,
            at: item.transferredAt,
        }));

        return successResponse(
            rankTransfers(records, owned.sourceIds),
            "Lấy gợi ý chuyển tiền thành công",
        );
    }
}
