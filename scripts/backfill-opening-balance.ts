/**
 * Bổ sung "Số dư ban đầu" cho nguồn tiền tạo trước khi app ghi BalanceAdjustment,
 * để sổ cái (giao dịch + điều chỉnh) giải thích đủ số dư/dư nợ đang lưu. Cần chạy MỘT LẦN
 * trước khi dùng đối soát (`reconcile-balances.ts`, nút "Đối soát" trong lịch sử nguồn).
 *
 *   bun scripts/backfill-opening-balance.ts                 # chạy thử, chỉ báo cáo
 *   bun scripts/backfill-opening-balance.ts --apply         # ghi vào DB
 *   bun scripts/backfill-opening-balance.ts --user <id>     # chỉ một user
 *
 * Với mỗi nguồn chưa có `ledgerCompleteAt` (kể cả đã lưu trữ):
 * 1. Bản ghi điều chỉnh cũ đầu tiên có previousValue = 0, ghi trong 60 giây sau khi tạo nguồn
 *    và chưa có `kind` → đánh dấu `kind = OPENING` (là số dư ban đầu lúc tạo).
 * 2. chênh = số đang lưu − sổ cái. Khác 0 thì tạo một BalanceAdjustment OPENING bằng phần chênh,
 *    đặt ngày ngay trước biến động sớm nhất của nguồn.
 * 3. Đặt `ledgerCompleteAt` = bây giờ.
 *
 * Lưu ý: lệch có sẵn từ trước (rollback lỗi cũ) bị gộp vào số dư ban đầu vì không phân biệt được.
 * Chạy lúc không ai đang ghi giao dịch; nguồn có số đổi giữa hai lần đọc sẽ bị bỏ qua.
 * Idempotent: nguồn đã có `ledgerCompleteAt` không bị đụng lại.
 */
import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import BalanceAdjustmentsModel from "@/server/models/balance-adjustments.model";
import {
    BalanceAdjustmentField,
    BalanceAdjustmentKind,
} from "@/libs/interfaces/balanceAdjustmentsData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";
import { computeLedgerBalance, findEarliestMovement } from "@/server/utils/ledgerBalance";

const apply = process.argv.includes("--apply");
const userArgIndex = process.argv.indexOf("--user");
const onlyUserId = userArgIndex > -1 ? process.argv[userArgIndex + 1] : undefined;
const OPENING_WINDOW_MS = 60 * 1000;

type SourceRow = {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    name: string;
    type: SourcesOfMoneyType;
    balance?: number;
    creditDetails?: { currentDebt?: number };
    archivedAt?: Date | null;
    createdAt: Date;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readState(source: SourceRow) {
    const fresh = await SourcesOfMoneyModel.findById(source._id).lean<SourceRow>();
    if (!fresh) return null;
    const { ledger } = await computeLedgerBalance(source.userId, source._id, source.type);
    return { stored: getTrackedAmount(fresh), ledger };
}

/** Bản ghi "Số dư ban đầu" cũ (trước khi có `kind`) → OPENING. Trả về số bản ghi đã/ sẽ đánh dấu. */
async function markLegacyOpening(source: SourceRow) {
    const first = await BalanceAdjustmentsModel.findOne({
        userId: source.userId,
        sourceOfMoneyId: source._id,
    })
        .sort({ adjustedAt: 1, createdAt: 1 })
        .lean<{ _id: mongoose.Types.ObjectId; previousValue: number; adjustedAt: Date; kind?: string }>();
    if (!first || first.kind || first.previousValue !== 0) return 0;
    if (Math.abs(new Date(first.adjustedAt).getTime() - new Date(source.createdAt).getTime()) > OPENING_WINDOW_MS) {
        return 0;
    }
    if (apply) {
        await BalanceAdjustmentsModel.updateOne(
            { _id: first._id, kind: { $exists: false } },
            { $set: { kind: BalanceAdjustmentKind.OPENING } },
        );
    }
    return 1;
}

async function main() {
    await dbConnect();

    const filter: Record<string, unknown> = {
        $or: [{ ledgerCompleteAt: null }, { ledgerCompleteAt: { $exists: false } }],
    };
    if (onlyUserId) filter.userId = new mongoose.Types.ObjectId(onlyUserId);

    const sources = await SourcesOfMoneyModel.find(filter)
        .sort({ userId: 1, createdAt: 1 })
        .lean<SourceRow[]>();
    if (sources.length === 0) {
        console.log("Mọi nguồn tiền đã có sổ cái đầy đủ. Không có gì cần làm.");
        return;
    }

    let marked = 0;
    let openingCreated = 0;
    let completed = 0;
    const skipped: string[] = [];

    for (const source of sources) {
        const label = `${source.name} (${source.type}${source.archivedAt ? ", đã lưu trữ" : ""}, user ${source.userId}, ${source._id})`;
        marked += await markLegacyOpening(source);

        const first = await readState(source);
        await wait(300);
        const second = await readState(source);
        if (!first || !second || first.stored !== second.stored || first.ledger !== second.ledger) {
            skipped.push(`${label}: số dư đổi trong lúc đọc, chạy lại sau`);
            continue;
        }

        const diff = second.stored - second.ledger;
        if (!Number.isInteger(diff)) {
            skipped.push(`${label}: chênh ${diff} không phải số nguyên (dữ liệu cũ có số lẻ), cần xử lý tay`);
            continue;
        }

        console.log(
            `- ${label} | đang lưu ${second.stored} | sổ cái ${second.ledger} | ${
                diff === 0 ? "khớp" : `bổ sung số dư ban đầu ${diff > 0 ? "+" : ""}${diff}`
            }`,
        );

        if (!apply) continue;

        if (diff !== 0) {
            const earliest = await findEarliestMovement(source.userId, source._id);
            const createdAt = new Date(source.createdAt);
            const base = earliest && earliest < createdAt ? earliest : createdAt;
            await BalanceAdjustmentsModel.create({
                userId: source.userId,
                sourceOfMoneyId: source._id,
                field:
                    source.type === SourcesOfMoneyType.CREDIT_CARD
                        ? BalanceAdjustmentField.CREDIT_DEBT
                        : BalanceAdjustmentField.BALANCE,
                kind: BalanceAdjustmentKind.OPENING,
                previousValue: 0,
                newValue: diff,
                delta: diff,
                note: "Số dư ban đầu (bổ sung khi đối soát)",
                adjustedAt: new Date(base.getTime() - 1),
            });
            openingCreated += 1;
        }
        await SourcesOfMoneyModel.updateOne(
            { _id: source._id, ledgerCompleteAt: null },
            { $set: { ledgerCompleteAt: new Date() } },
        );
        completed += 1;
    }

    if (skipped.length) {
        console.log("\nBỏ qua:");
        for (const line of skipped) console.log(`  ! ${line}`);
    }
    if (!apply) {
        console.log(
            `\nChạy thử: ${sources.length} nguồn chưa có sổ cái đầy đủ, ${marked} bản ghi "Số dư ban đầu" cũ sẽ được đánh dấu. Thêm --apply để ghi vào DB.`,
        );
        return;
    }
    console.log(
        `\nĐã đánh dấu ${marked} bản ghi cũ, tạo ${openingCreated} số dư ban đầu bổ sung, hoàn tất ${completed}/${sources.length} nguồn.`,
    );
    if (skipped.length) process.exitCode = 1;
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
