import { expect } from "bun:test";
import mongoose from "mongoose";
import CategoriesModel from "@/server/models/categories.model";
import SourcesOfMoneyModel from "@/server/models/sources-of-money.model";
import { SourcesOfMoneyService } from "@/server/services/sources-of-money.service";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { getTrackedAmount } from "@/libs/utils/trackedAmount";
import { computeLedgerBalance } from "@/server/utils/ledgerBalance";
import { testAuth } from "./setup";

export { testAuth };

/** Đọc response của service: `{ status, body }`. */
export async function call(responsePromise: Promise<Response> | Response) {
    const response = await responsePromise;
    const body = await response.json();
    return { status: response.status, body, data: body?.data };
}

export async function makeCategory(kind: CategoryKind = CategoryKind.EXPENSE, name = "Ăn uống") {
    const category = await CategoriesModel.create({ userId: testAuth.userId, name, kind });
    return category._id.toString();
}

/** Tạo nguồn qua service thật (ghi số dư ban đầu + ledgerCompleteAt như app). */
export async function makeSource(
    options: { type?: SourcesOfMoneyType; balance?: number; creditLimit?: number; currentDebt?: number; name?: string } = {},
) {
    const type = options.type ?? SourcesOfMoneyType.BANK;
    const isCard = type === SourcesOfMoneyType.CREDIT_CARD;
    const { status, body } = await call(
        SourcesOfMoneyService.createSourcesOfMoney({
            name: options.name ?? (isCard ? "Thẻ" : "Ngân hàng"),
            type,
            ...(isCard
                ? {
                      creditDetails: {
                          creditLimit: options.creditLimit ?? 10_000_000,
                          currentDebt: options.currentDebt ?? 0,
                      },
                  }
                : { balance: options.balance ?? 0 }),
        }),
    );
    expect(status).toBe(200);
    return body.data._id as string;
}

export async function trackedOf(sourceId: string) {
    const source = await SourcesOfMoneyModel.findById(sourceId).lean<{
        type: SourcesOfMoneyType;
        balance?: number;
        creditDetails?: { currentDebt?: number };
    }>();
    if (!source) throw new Error("source not found");
    return getTrackedAmount(source);
}

/** Bất biến: số lưu luôn bằng sổ cái. Gọi cuối mỗi kịch bản. */
export async function expectLedgerMatches(...sourceIds: string[]) {
    for (const sourceId of sourceIds) {
        const source = await SourcesOfMoneyModel.findById(sourceId).lean<{ type: SourcesOfMoneyType }>();
        if (!source) throw new Error("source not found");
        const { ledger } = await computeLedgerBalance(testAuth.userId, sourceId, source.type);
        expect({ sourceId, stored: await trackedOf(sourceId) }).toEqual({ sourceId, stored: ledger });
    }
}

export const objectId = () => new mongoose.Types.ObjectId().toString();
