/**
 * Đối soát số dư/dư nợ đang lưu với sổ cái (giao dịch + điều chỉnh + phí đáo hạn) của mọi nguồn,
 * và liệt kê các lần bù trừ (rollback) lỗi chưa xử lý (collection `integrityIssues`).
 * Chạy `backfill-opening-balance.ts --apply` một lần trước, nếu không nguồn cũ luôn báo lệch.
 *
 *   bun scripts/reconcile-balances.ts                # chạy thử, chỉ báo cáo
 *   bun scripts/reconcile-balances.ts --apply        # sửa số lưu về theo sổ (chỉ nguồn sửa được)
 *   bun scripts/reconcile-balances.ts --all          # gồm cả nguồn đã lưu trữ
 *   bun scripts/reconcile-balances.ts --user <id>    # chỉ một user
 *
 * Sổ cái là sự thật: `--apply` đặt lại số lưu, không tạo điều chỉnh mới. Không sửa nguồn thiếu
 * số dư ban đầu, nguồn đã lưu trữ, hoặc nguồn có số theo sổ âm / vượt hạn mức — các trường hợp đó
 * cần người xem lại giao dịch. Mã thoát 1 khi còn lệch, để dùng trong cron.
 */
import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import IntegrityIssuesModel from "@/server/models/integrity-issues.model";
import type { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import {
    applySourceReconcile,
    inspectSourceBalance,
} from "@/server/services/balance-reconcile.service";

const apply = process.argv.includes("--apply");
const includeArchived = process.argv.includes("--all");
const userArgIndex = process.argv.indexOf("--user");
const onlyUserId = userArgIndex > -1 ? process.argv[userArgIndex + 1] : undefined;

type SourceRow = {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    name: string;
    type: SourcesOfMoneyType;
    balance?: number;
    creditDetails?: { creditLimit?: number; currentDebt?: number };
    archivedAt?: Date | null;
    ledgerCompleteAt?: Date | null;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    await dbConnect();

    const filter: Record<string, unknown> = {};
    if (!includeArchived) filter.archivedAt = null;
    if (onlyUserId) filter.userId = new mongoose.Types.ObjectId(onlyUserId);

    const sources = await SourcesOfMoneyModel.find(filter)
        .sort({ userId: 1, sortOrder: 1 })
        .lean<SourceRow[]>();

    let mismatched = 0;
    let fixed = 0;
    for (const source of sources) {
        const result = await inspectSourceBalance(source.userId, source);
        if (result.diff === 0 && result.openIssues === 0) continue;

        const label = `${source.name} (${source.type}${source.archivedAt ? ", đã lưu trữ" : ""}, user ${source.userId}, ${source._id})`;
        console.log(
            [
                `- ${label}`,
                `đang lưu ${result.stored}`,
                `sổ cái ${result.ledger}`,
                `lệch ${result.diff}`,
                result.openIssues ? `${result.openIssues} issue mở` : "",
                result.blockReason ? `không tự sửa: ${result.blockReason}` : "",
            ]
                .filter(Boolean)
                .join(" | "),
        );
        if (result.diff === 0) continue;
        mismatched += 1;

        if (!apply || !result.canApply) continue;
        // Đọc lại sau một nhịp: giao dịch đang chạy giữa chừng làm số đổi thì bỏ qua lần này
        await wait(500);
        const fresh = await SourcesOfMoneyModel.findById(source._id).lean<SourceRow>();
        if (!fresh) continue;
        const again = await inspectSourceBalance(source.userId, fresh);
        if (again.stored !== result.stored || again.ledger !== result.ledger) {
            console.log("  ! Số vừa đổi trong lúc đối soát, bỏ qua lần này");
            continue;
        }
        try {
            await applySourceReconcile(source.userId, source._id, {
                expectedStored: again.stored,
                expectedLedger: again.ledger,
            });
            fixed += 1;
            console.log(`  → đã sửa về ${again.ledger}`);
        } catch (error) {
            console.log(`  ! Không sửa được: ${error instanceof Error ? error.message : error}`);
        }
    }

    const issueFilter: Record<string, unknown> = { resolvedAt: null };
    if (onlyUserId) issueFilter.userId = new mongoose.Types.ObjectId(onlyUserId);
    const openIssues = await IntegrityIssuesModel.find(issueFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean<
            {
                createdAt: Date;
                operation: string;
                step: string;
                sourceOfMoneyId?: mongoose.Types.ObjectId;
                amount?: number;
                rollbackError?: string;
            }[]
        >();
    if (openIssues.length) {
        console.log(`\nBù trừ lỗi chưa xử lý (tối đa 50 gần nhất):`);
        for (const issue of openIssues) {
            console.log(
                `  ${issue.createdAt.toISOString()} ${issue.operation}/${issue.step} nguồn ${issue.sourceOfMoneyId ?? "-"} số ${issue.amount ?? "-"}: ${issue.rollbackError}`,
            );
        }
    }

    console.log(
        `\n${sources.length} nguồn đã kiểm, ${mismatched} nguồn lệch${apply ? `, đã sửa ${fixed}` : ""}.`,
    );
    if (!apply && mismatched > 0) console.log("Chạy thử. Thêm --apply để sửa các nguồn sửa được.");
    if (mismatched - fixed > 0) process.exitCode = 1;
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
