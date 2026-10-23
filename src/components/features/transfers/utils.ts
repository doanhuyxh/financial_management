import type {
    ITransferCategoryRef,
    ITransferSourceRef,
    ITransfersData,
} from "@/libs/interfaces/transfersData";
import { SourcesOfMoneyType } from "@/libs/interfaces/sourcesOfMoneyData";
import { withArchivedLabel } from "@/libs/utils/archivedRef";

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
    return withArchivedLabel(value);
}

export function getTransferCategory(
    value: ITransfersData["feeCategoryId"],
): ITransferCategoryRef | null {
    if (!value) return null;
    if (typeof value === "string") {
        return { _id: value, name: "—" };
    }
    return withArchivedLabel(value);
}

export function getRefId(
    value: string | { _id: string } | null | undefined,
): string {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id;
}

export { currencyFormatter, formatMoney } from "@/libs/utils/formatMoney";
