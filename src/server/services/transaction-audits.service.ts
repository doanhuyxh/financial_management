import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import TransactionAuditsModel from "@/server/models/transaction-audits.model";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import {
    TransactionAuditKind,
    type IPaginatedTransactionAuditsQuery,
    type ITransactionAuditSnapshot,
} from "@/libs/interfaces/transactionAuditsData";
import { successResponsePageNation, unauthorizedResponse } from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { normalizePagination } from "../utils/pagination";

const NAMED_ID_FIELDS = ["categoryId", "sourceOfMoneyId", "fromSourceId", "toSourceId"] as const;

/** id danh mục / nguồn tiền có trong các snapshot → tên (kể cả mục đã lưu trữ hoặc xóa mềm). */
async function resolveNames(userId: string, snapshots: (ITransactionAuditSnapshot | null)[]) {
    const ids = new Set<string>();
    for (const snapshot of snapshots) {
        for (const field of NAMED_ID_FIELDS) {
            const id = snapshot?.[field];
            if (id && mongoose.isValidObjectId(id)) ids.add(id);
        }
    }
    if (ids.size === 0) return {};
    const idList = [...ids];
    const [categories, sources] = await Promise.all([
        CategoriesModel.find({ userId, _id: { $in: idList } }).select("name").lean(),
        SourcesOfMoneyModel.find({ userId, _id: { $in: idList } }).select("name").lean(),
    ]);
    const names: Record<string, string> = {};
    for (const doc of [...categories, ...sources] as unknown as { _id: unknown; name?: string }[]) {
        names[String(doc._id)] = doc.name ?? "";
    }
    return names;
}

export class TransactionAuditsService {
    static async getTransactionAudits(query: IPaginatedTransactionAuditsQuery) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const { page, limit } = normalizePagination(query.page, query.limit, 20);
        const filter: Record<string, unknown> = { userId: user.userId };
        if (query.kind && Object.values(TransactionAuditKind).includes(query.kind)) {
            filter.kind = query.kind;
        }

        const [items, total] = await Promise.all([
            TransactionAuditsModel.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            TransactionAuditsModel.countDocuments(filter),
        ]);
        const typed = items as unknown as {
            before: ITransactionAuditSnapshot;
            after: ITransactionAuditSnapshot | null;
        }[];
        const names = await resolveNames(
            user.userId,
            typed.flatMap((item) => [item.before, item.after]),
        );

        return successResponsePageNation(items, total, page, limit, "", { names });
    }
}
