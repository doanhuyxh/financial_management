import mongoose, { type Model, type PipelineStage } from "mongoose";
import dbConnect from "@/server/connectDb";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import ExpensesModel from "@/server/models/expenses.model";
import IncomesModel from "@/server/models/incomes.model";
import TransfersModel from "@/server/models/transfers.model";
import BalanceAdjustmentsModel from "@/server/models/balance-adjustments.model";
import CategoriesModel from "@/server/models/categories.model";
import {
    SourceTransactionFilter,
    SourceTransactionKind,
    type ISourceTransactionQuery,
    type ISourceTransactionSummary,
} from "@/libs/interfaces/sourceTransactionsData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { normalizePagination } from "../utils/pagination";
import { buildDayRange, normalizeDay } from "../utils/dayRange";

const DEFAULT_LIMIT = 20;

type Branch = { model: Model<any>; pipeline: PipelineStage.UnionWithPipelineStage[] };

/** Lấy phần tử đầu của mảng $lookup, chỉ giữ `_id`, `name`, `archivedAt` (bỏ qua nếu không có). */
function pickRef(field: string) {
    return {
        $let: {
            vars: { ref: { $arrayElemAt: [`$${field}`, 0] } },
            in: {
                $cond: [
                    { $ifNull: ["$$ref", false] },
                    { _id: "$$ref._id", name: "$$ref.name", archivedAt: "$$ref.archivedAt" },
                    "$$REMOVE",
                ],
            },
        },
    };
}

export interface ISourceTransactionsOptions {
    userId: string;
    sourceId: string;
    sourceType: SourcesOfMoneyType;
    page: number;
    limit: number;
    kind?: SourceTransactionFilter;
    from?: string;
    to?: string;
    /** false: link public, chỉ trả thời gian, số tiền và nội dung; không có điều chỉnh tay. */
    internal: boolean;
}

/**
 * Gộp mọi biến động của một nguồn tiền thành một danh sách theo thời gian.
 * `delta` là biến động số dư (nguồn thường) hoặc dư nợ (thẻ): thẻ đảo dấu so với nguồn thường.
 * Phí chuyển tiền (expense `skipBalanceAdjust`) không thành dòng riêng vì đã nằm trong transfer.
 */
export async function querySourceTransactions(options: ISourceTransactionsOptions) {
    const { kind, internal, page, limit } = options;
    const userId = new mongoose.Types.ObjectId(options.userId);
    const sourceId = new mongoose.Types.ObjectId(options.sourceId);
    const sign = options.sourceType === SourcesOfMoneyType.CREDIT_CARD ? -1 : 1;
    const range = buildDayRange(options.from, options.to);
    const inRange = (field: string) => (range ? { [field]: range } : {});

    const wants = (filter: SourceTransactionFilter) => !kind || kind === filter;
    const branches: Branch[] = [];

    if (wants(SourceTransactionFilter.EXPENSE)) {
        branches.push({
            model: ExpensesModel,
            pipeline: [
                {
                    $match: {
                        userId,
                        sourceOfMoneyId: sourceId,
                        skipBalanceAdjust: { $ne: true },
                        ...inRange("spentAt"),
                    },
                },
                {
                    $project: {
                        kind: { $literal: SourceTransactionKind.EXPENSE },
                        occurredAt: "$spentAt",
                        delta: { $multiply: ["$amount", -sign] },
                        note: 1,
                        categoryId: 1,
                        cardFeeType: 1,
                        createdAt: 1,
                    },
                },
            ],
        });
    }

    if (wants(SourceTransactionFilter.INCOME)) {
        branches.push({
            model: IncomesModel,
            pipeline: [
                { $match: { userId, sourceOfMoneyId: sourceId, ...inRange("receivedAt") } },
                {
                    $project: {
                        kind: { $literal: SourceTransactionKind.INCOME },
                        occurredAt: "$receivedAt",
                        delta: { $multiply: ["$amount", sign] },
                        note: 1,
                        categoryId: 1,
                        createdAt: 1,
                    },
                },
            ],
        });
    }

    if (wants(SourceTransactionFilter.TRANSFER)) {
        branches.push(
            {
                model: TransfersModel,
                pipeline: [
                    { $match: { userId, fromSourceId: sourceId, ...inRange("transferredAt") } },
                    {
                        $project: {
                            kind: { $literal: SourceTransactionKind.TRANSFER_OUT },
                            occurredAt: "$transferredAt",
                            // Bên chuyển chịu đủ amount, phí trừ vào phần bên nhận nhận được
                            delta: { $multiply: ["$amount", -sign] },
                            note: 1,
                            feeAmount: 1,
                            counterpartSourceId: "$toSourceId",
                            createdAt: 1,
                        },
                    },
                ],
            },
            {
                model: TransfersModel,
                pipeline: [
                    { $match: { userId, toSourceId: sourceId, ...inRange("transferredAt") } },
                    {
                        $project: {
                            kind: { $literal: SourceTransactionKind.TRANSFER_IN },
                            occurredAt: "$transferredAt",
                            delta: {
                                $multiply: [
                                    { $subtract: ["$amount", { $ifNull: ["$feeAmount", 0] }] },
                                    sign,
                                ],
                            },
                            note: 1,
                            feeAmount: 1,
                            counterpartSourceId: "$fromSourceId",
                            createdAt: 1,
                        },
                    },
                ],
            },
        );
    }

    if (internal && wants(SourceTransactionFilter.ADJUSTMENT)) {
        branches.push({
            model: BalanceAdjustmentsModel,
            pipeline: [
                { $match: { userId, sourceOfMoneyId: sourceId, ...inRange("adjustedAt") } },
                {
                    $project: {
                        kind: { $literal: SourceTransactionKind.ADJUSTMENT },
                        occurredAt: "$adjustedAt",
                        delta: 1,
                        note: 1,
                        previousValue: 1,
                        newValue: 1,
                        createdAt: 1,
                    },
                },
            ],
        });
    }

    const emptySummary: ISourceTransactionSummary = { increase: 0, decrease: 0 };
    if (branches.length === 0) {
        return { items: [], total: 0, summary: emptySummary };
    }

    const itemStages: PipelineStage.FacetPipelineStage[] = internal
        ? [
              {
                  $lookup: {
                      from: CategoriesModel.collection.name,
                      localField: "categoryId",
                      foreignField: "_id",
                      as: "category",
                  },
              },
              {
                  $lookup: {
                      from: SourcesOfMoneyModel.collection.name,
                      localField: "counterpartSourceId",
                      foreignField: "_id",
                      as: "counterpartSource",
                  },
              },
              {
                  $project: {
                      kind: 1,
                      occurredAt: 1,
                      delta: 1,
                      note: 1,
                      cardFeeType: 1,
                      feeAmount: 1,
                      previousValue: 1,
                      newValue: 1,
                      category: pickRef("category"),
                      counterpartSource: pickRef("counterpartSource"),
                  },
              },
          ]
        : [{ $project: { _id: 0, occurredAt: 1, delta: 1, note: 1 } }];

    const [first, ...rest] = branches;
    const [result] = await first.model.aggregate<{
        items: unknown[];
        total: { count: number }[];
        summary: ISourceTransactionSummary[];
    }>([
        ...first.pipeline,
        ...rest.map((branch) => ({
            $unionWith: { coll: branch.model.collection.name, pipeline: branch.pipeline },
        })),
        { $sort: { occurredAt: -1, createdAt: -1, _id: -1 } },
        {
            $facet: {
                items: [{ $skip: (page - 1) * limit }, { $limit: limit }, ...itemStages],
                total: [{ $count: "count" }],
                summary: [
                    {
                        $group: {
                            _id: null,
                            increase: {
                                $sum: { $cond: [{ $gt: ["$delta", 0] }, "$delta", 0] },
                            },
                            decrease: {
                                $sum: { $cond: [{ $lt: ["$delta", 0] }, { $abs: "$delta" }, 0] },
                            },
                        },
                    },
                    { $project: { _id: 0 } },
                ],
            },
        },
    ]);

    return {
        items: result?.items ?? [],
        total: result?.total[0]?.count ?? 0,
        summary: result?.summary[0] ?? emptySummary,
    };
}

export function normalizeTransactionQuery(query: ISourceTransactionQuery) {
    const { page, limit } = normalizePagination(query.page, query.limit, DEFAULT_LIMIT);
    const kind = Object.values(SourceTransactionFilter).includes(
        query.kind as SourceTransactionFilter,
    )
        ? query.kind
        : undefined;
    return { page, limit, kind, from: normalizeDay(query.from), to: normalizeDay(query.to) };
}

export function buildPagination(total: number, page: number, limit: number) {
    return { total, page, limit, totalPages: Math.ceil(total / limit) };
}

export class SourceTransactionsService {
    static async getSourceTransactions(sourceId: string, query: ISourceTransactionQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        if (!mongoose.isValidObjectId(sourceId)) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }
        // Nguồn đã lưu trữ vẫn xem được lịch sử
        const source = await SourcesOfMoneyModel.findOne({ _id: sourceId, userId: user.userId })
            .select("type")
            .lean<{ type: SourcesOfMoneyType }>();
        if (!source) {
            return errorResponseWithStatusCode("Không tìm thấy nguồn tiền", 404);
        }

        const normalized = normalizeTransactionQuery(query);
        const { items, total, summary } = await querySourceTransactions({
            ...normalized,
            userId: user.userId,
            sourceId,
            sourceType: source.type,
            internal: true,
        });

        return successResponse({
            items,
            pagination: buildPagination(total, normalized.page, normalized.limit),
            summary,
        });
    }
}
