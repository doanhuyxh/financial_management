import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import DepositRateSnapshotsModel, {
    type IDepositRateSnapshot,
} from "@/server/models/deposit-rate-snapshots.model";
import DepositRatesModel, { type IDepositRate } from "@/server/models/deposit-rates.model";
import {
    DEPOSIT_PRODUCT_MAX_LENGTH,
    DepositRateOrigin,
    MAX_DEPOSIT_RATE_PERCENT,
    type IDepositRateComparisonData,
    type IDepositRateTableData,
    type IDepositRateTier,
    type IFromDepositRateData,
} from "@/libs/interfaces/depositRatesData";
import {
    errorResponseWithStatusCode,
    successResponse,
    unauthorizedResponse,
} from "../utils/responseServer";
import { getCurrentUser } from "../utils/getCurrentUser";
import { fetchText } from "../utils/depositRates/fetchText";
import {
    DEPOSIT_RATE_PROVIDERS,
    type IDepositRateProvider,
    type IParsedDepositTable,
} from "../utils/depositRates/providers";

/** Bảng tự động cũ hơn mốc này thì lấy lại khi có người mở trang. */
const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000;
/** Lần thử gần nhất (kể cả lỗi) mới hơn mốc này thì không thử lại — tránh gọi trang ngân hàng dồn dập. */
const RETRY_AFTER_MS = 10 * 60 * 1000;
const MAX_MANUAL_TABLES = 30;
const MIN_TERMS_PER_TABLE = 3;

declare global {
    var depositRatesRefreshing: Promise<number> | undefined;
}

const snapshotKey = (provider: IDepositRateProvider, productKey: string) =>
    `${provider.id}:${productKey}`;

function isValidRate(rate: unknown): rate is number {
    return typeof rate === "number" && Number.isFinite(rate) && rate > 0 && rate <= MAX_DEPOSIT_RATE_PERCENT;
}

/** Bảng đọc được phải hợp lý: bậc đầu từ 0, đủ kỳ hạn, mọi lãi suất trong (0, 20]%. Sai → coi như đọc lỗi. */
function assertSaneTable(table: IParsedDepositTable) {
    const [first] = table.tiers;
    if (!first || first.minAmount !== 0 || Object.keys(first.rates).length < MIN_TERMS_PER_TABLE) {
        throw new Error("Bảng lãi suất đọc được không đủ kỳ hạn");
    }
    for (const tier of table.tiers) {
        for (const [term, rate] of Object.entries(tier.rates)) {
            if (!/^\d+$/.test(term) || !isValidRate(rate)) {
                throw new Error("Lãi suất đọc được không hợp lệ");
            }
        }
    }
}

function errorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 200);
}

/** Lấy một ngân hàng; lỗi thì giữ số cũ, chỉ ghi `lastError`. Trả số bảng cập nhật được. */
async function refreshProvider(provider: IDepositRateProvider, now: Date) {
    const base = { bankCode: provider.bankCode, bankName: provider.bankName, sourceUrl: provider.sourceUrl };
    try {
        const tables = provider.parse(await fetchText(provider.sourceUrl));
        tables.forEach(assertSaneTable);
        if (tables.length === 0) throw new Error("Không đọc được bảng lãi suất");
        await Promise.all(
            tables.map((table) =>
                DepositRateSnapshotsModel.updateOne(
                    { key: snapshotKey(provider, table.productKey) },
                    {
                        $set: {
                            ...base,
                            product: table.product,
                            tiers: table.tiers,
                            fetchedAt: now,
                            lastAttemptAt: now,
                            lastError: null,
                        },
                    },
                    { upsert: true },
                ),
            ),
        );
        return tables.length;
    } catch (error) {
        console.warn("[deposit-rates] Không lấy được lãi suất", provider.id, errorMessage(error));
        await Promise.all(
            provider.products.map((product) =>
                DepositRateSnapshotsModel.updateOne(
                    { key: snapshotKey(provider, product.productKey) },
                    {
                        $set: { lastAttemptAt: now, lastError: errorMessage(error) },
                        $setOnInsert: { ...base, product: product.product, tiers: [], fetchedAt: null },
                    },
                    { upsert: true },
                ),
            ),
        );
        return 0;
    }
}

/** Lấy lại mọi ngân hàng song song; một request tại một thời điểm (các request khác chờ chung). */
export function refreshAllDepositRates(providers = DEPOSIT_RATE_PROVIDERS, now = new Date()) {
    global.depositRatesRefreshing ??= Promise.all(
        providers.map((provider) => refreshProvider(provider, now)),
    )
        .then((counts) => counts.reduce((sum, count) => sum + count, 0))
        .finally(() => {
            global.depositRatesRefreshing = undefined;
        });
    return global.depositRatesRefreshing;
}

/** Ngân hàng cần lấy lại: chưa có, quá 12 giờ, và lần thử cuối đã cách đủ 10 phút. */
function providersDue(snapshots: IDepositRateSnapshot[], now: number) {
    return DEPOSIT_RATE_PROVIDERS.filter((provider) =>
        provider.products.some((product) => {
            const snapshot = snapshots.find((item) => item.key === snapshotKey(provider, product.productKey));
            if (snapshot?.lastAttemptAt && now - snapshot.lastAttemptAt.getTime() < RETRY_AFTER_MS) {
                return false;
            }
            return !snapshot?.fetchedAt || now - snapshot.fetchedAt.getTime() > REFRESH_AFTER_MS;
        }),
    );
}

function loadSnapshots() {
    return DepositRateSnapshotsModel.find({
        key: {
            $in: DEPOSIT_RATE_PROVIDERS.flatMap((provider) =>
                provider.products.map((product) => snapshotKey(provider, product.productKey)),
            ),
        },
    }).lean<IDepositRateSnapshot[]>();
}

function toAutoTable(snapshot: IDepositRateSnapshot): IDepositRateTableData {
    return {
        _id: snapshot.key,
        origin: DepositRateOrigin.AUTO,
        bankCode: snapshot.bankCode,
        bankName: snapshot.bankName,
        product: snapshot.product,
        sourceUrl: snapshot.sourceUrl,
        tiers: snapshot.tiers ?? [],
        updatedAt: (snapshot.fetchedAt ?? snapshot.updatedAt).toISOString(),
        lastError: snapshot.lastError,
    };
}

function toManualTable(doc: IDepositRate): IDepositRateTableData {
    return {
        _id: String(doc._id),
        origin: DepositRateOrigin.MANUAL,
        bankCode: doc.bankCode,
        bankName: doc.bankName,
        product: doc.product,
        sourceUrl: null,
        tiers: doc.tiers ?? [],
        updatedAt: doc.updatedAt.toISOString(),
        lastError: null,
    };
}

/** Kiểm tra form nhập tay → một bậc lãi suất (minAmount 0). */
function normalizeManualPayload(data: IFromDepositRateData) {
    const bankCode = typeof data?.bankCode === "string" ? data.bankCode.trim() : "";
    const bankName = typeof data?.bankName === "string" ? data.bankName.trim() : "";
    const product = typeof data?.product === "string" ? data.product.trim() : "";
    if (!bankCode || !bankName) throw new Error("Chọn ngân hàng");
    if (bankCode.length > 20 || bankName.length > 100) throw new Error("Ngân hàng không hợp lệ");
    if (product.length > DEPOSIT_PRODUCT_MAX_LENGTH) {
        throw new Error(`Tên sản phẩm tối đa ${DEPOSIT_PRODUCT_MAX_LENGTH} ký tự`);
    }

    const rates: Record<string, number> = {};
    for (const item of Array.isArray(data?.rates) ? data.rates : []) {
        const term = Number(item?.termMonths);
        const rate = Number(item?.rate);
        if (!Number.isInteger(term) || term < 1 || term > 120) throw new Error("Kỳ hạn không hợp lệ");
        if (!isValidRate(rate)) {
            throw new Error(`Lãi suất phải lớn hơn 0 và không quá ${MAX_DEPOSIT_RATE_PERCENT}%/năm`);
        }
        rates[String(term)] = Math.round(rate * 100) / 100;
    }
    if (Object.keys(rates).length === 0) throw new Error("Nhập lãi suất cho ít nhất một kỳ hạn");
    const tiers: IDepositRateTier[] = [{ minAmount: 0, rates }];
    return { bankCode, bankName, product, tiers };
}

export class DepositRatesService {
    /**
     * Bảng tự động (dùng chung) + bảng user tự nhập. Bảng tự động cũ thì lấy lại trước khi trả
     * (chờ tối đa thời gian timeout của từng ngân hàng); lỗi thì trả số cũ kèm `lastError`.
     */
    static async getComparison() {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const due = providersDue(await loadSnapshots(), Date.now());
        if (due.length > 0) await refreshAllDepositRates(due);

        const [snapshots, manual] = await Promise.all([
            loadSnapshots(),
            DepositRatesModel.find({ userId: user.userId }).sort({ createdAt: 1 }).lean<IDepositRate[]>(),
        ]);
        const data: IDepositRateComparisonData = {
            tables: [...snapshots.map(toAutoTable), ...manual.map(toManualTable)],
        };
        return successResponse(data);
    }

    /** Nút "Lấy lại": bỏ qua mốc 12 giờ nhưng vẫn giữ khoảng nghỉ 10 phút giữa hai lần thử. */
    static async refresh() {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        const now = Date.now();
        const snapshots = await loadSnapshots();
        const ready = DEPOSIT_RATE_PROVIDERS.filter((provider) =>
            provider.products.every((product) => {
                const attempt = snapshots.find(
                    (item) => item.key === snapshotKey(provider, product.productKey),
                )?.lastAttemptAt;
                return !attempt || now - attempt.getTime() >= RETRY_AFTER_MS;
            }),
        );
        if (ready.length === 0) {
            return errorResponseWithStatusCode("Vừa lấy lại gần đây, thử lại sau 10 phút", 429);
        }
        const succeeded = await refreshAllDepositRates(ready);
        const total = ready.reduce((sum, provider) => sum + provider.products.length, 0);
        return successResponse({ succeeded, total }, `Đã cập nhật ${succeeded}/${total} bảng lãi suất`);
    }

    static async createManual(data: IFromDepositRateData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();

        try {
            const payload = normalizeManualPayload(data);
            const count = await DepositRatesModel.countDocuments({ userId: user.userId });
            if (count >= MAX_MANUAL_TABLES) {
                throw new Error(`Tối đa ${MAX_MANUAL_TABLES} bảng lãi suất tự nhập`);
            }
            const created = await DepositRatesModel.create({ ...payload, userId: user.userId });
            return successResponse(toManualTable(created), "Đã thêm lãi suất");
        } catch (error) {
            return errorResponseWithStatusCode(errorMessage(error), 400);
        }
    }

    static async updateManual(id: string, data: IFromDepositRateData) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();
        if (!mongoose.isValidObjectId(id)) return errorResponseWithStatusCode("Không tìm thấy", 404);

        try {
            const payload = normalizeManualPayload(data);
            const updated = await DepositRatesModel.findOneAndUpdate(
                { _id: id, userId: user.userId },
                { $set: payload },
                { returnDocument: "after" },
            ).lean<IDepositRate>();
            if (!updated) return errorResponseWithStatusCode("Không tìm thấy", 404);
            return successResponse(toManualTable(updated), "Đã cập nhật lãi suất");
        } catch (error) {
            return errorResponseWithStatusCode(errorMessage(error), 400);
        }
    }

    static async deleteManual(id: string) {
        await dbConnect();
        const user = await getCurrentUser();
        if (!user?.userId) return unauthorizedResponse();
        if (!mongoose.isValidObjectId(id)) return errorResponseWithStatusCode("Không tìm thấy", 404);

        const deleted = await DepositRatesModel.findOneAndDelete({ _id: id, userId: user.userId });
        if (!deleted) return errorResponseWithStatusCode("Không tìm thấy", 404);
        return successResponse(null, "Đã xóa");
    }
}
