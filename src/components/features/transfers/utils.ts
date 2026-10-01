import type {
    ITransferCategoryRef,
    ITransferSourceRef,
    ITransfersData,
} from "@/libs/interfaces/transfersData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";

export function getTransferSource(
    value: ITransfersData["fromSourceId"] | ITransfersData["toSourceId"],
): ITransferSourceRef | null {
    if (!value) return null;
    if (typeof value === "string") {
        return {
            _id: value,
            name: "—",
            type: SourcesOfMoneyType.OTHER,
        };
    }
    return value;
}

export function getTransferCategory(
    value: ITransfersData["feeCategoryId"],
): ITransferCategoryRef | null {
    if (!value) return null;
    if (typeof value === "string") {
        return { _id: value, name: "—" };
    }
    return value;
}

export function getRefId(
    value: string | { _id: string } | null | undefined,
): string {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id;
}

export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});

export function formatMoney(value?: number | null) {
    if (value == null || Number.isNaN(value)) return "—";
    return currencyFormatter.format(value);
}
