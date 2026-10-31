"use client";

import { Alert } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useGetCreditCardFeeProgress } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { SourcesOfMoneyType, type ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";
import { formatMoney } from "@/libs/utils/formatMoney";

/**
 * Thẻ có phí sử dụng theo kỳ: báo khi khoản chi này là giao dịch đầu tiên của kỳ sao kê
 * hiện tại (sẽ phát sinh phí). Ngày chi ở kỳ khác thì không báo.
 */
export default function CardUsageFeeAlert({
    source,
    date,
}: {
    source: ISourcesOfMoneyData | null;
    date?: Dayjs | null;
}) {
    const usageFee =
        source?.type === SourcesOfMoneyType.CREDIT_CARD ? source.creditDetails?.usageFee : null;
    const { data } = useGetCreditCardFeeProgress();
    if (usageFee == null || !source) return null;

    const progress = data?.data?.find((item) => item.sourceOfMoneyId === source._id);
    if (!progress || progress.cycleTransactions > 0) return null;

    const day = (date ?? dayjs()).startOf("day");
    const inCycle =
        !day.isBefore(dayjs(progress.cycleStart), "day") && day.isBefore(dayjs(progress.cycleEnd));
    if (!inCycle) return null;

    return (
        <Alert
            type="warning"
            showIcon
            className="mb-4"
            message={`Khoản chi đầu tiên trong kỳ sao kê: thẻ sẽ thu phí sử dụng ~${formatMoney(usageFee)}`}
            description="Các khoản chi tiếp theo trong kỳ này không mất thêm phí sử dụng."
        />
    );
}
