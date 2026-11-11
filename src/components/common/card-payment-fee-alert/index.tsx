"use client";

import dayjs, { type Dayjs } from "dayjs";
import { Info, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/ui/alert";
import { useGetCreditCardFeeProgress } from "@/libs/hooks/customHooks/useSourcesOfMoney";
import { SourcesOfMoneyType, type ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";
import { formatMoney } from "@/libs/utils/formatMoney";

/**
 * Cảnh báo khi trả nợ thẻ (chuyển tiền vào thẻ) sẽ vượt số lần miễn phí trong
 * kỳ sao kê hiện tại. Chỉ xét ngày thuộc kỳ hiện tại; ngày ở kỳ khác thì không cảnh báo.
 */
export default function CardPaymentFeeAlert({
    source,
    date,
}: {
    source: ISourcesOfMoneyData | null;
    date?: Dayjs | null;
}) {
    const paymentFee =
        source?.type === SourcesOfMoneyType.CREDIT_CARD ? source.creditDetails?.paymentFee : null;
    const { data } = useGetCreditCardFeeProgress();
    if (paymentFee == null || !source) return null;

    const progress = data?.data?.find((item) => item.sourceOfMoneyId === source._id);
    if (!progress) return null;

    const day = (date ?? dayjs()).startOf("day");
    const inCycle =
        !day.isBefore(dayjs(progress.cycleStart), "day") && day.isBefore(dayjs(progress.cycleEnd));
    if (!inCycle) return null;

    const freePayments = source.creditDetails?.freePaymentsPerCycle ?? 0;
    const paymentNumber = progress.cyclePayments + 1;

    if (paymentNumber > freePayments) {
        return (
            <Alert className="border-warn/40 bg-warn-soft text-warn">
                <TriangleAlert />
                <AlertTitle>
                    {`Lần trả nợ thứ ${paymentNumber} trong kỳ sao kê, có thể bị thu ~${formatMoney(paymentFee)}`}
                </AlertTitle>
                {freePayments > 0 ? (
                    <AlertDescription className="text-foreground/80">
                        {`Thẻ chỉ miễn phí ${freePayments} lần trả nợ mỗi kỳ. Nên gộp các lần trả nợ thành một.`}
                    </AlertDescription>
                ) : null}
            </Alert>
        );
    }
    if (paymentNumber === freePayments) {
        return (
            <Alert className="border-credit/40 bg-credit-soft text-credit">
                <Info />
                <AlertTitle>
                    {`Lần trả nợ miễn phí cuối cùng của kỳ này; lần sau sẽ mất ~${formatMoney(paymentFee)}`}
                </AlertTitle>
            </Alert>
        );
    }
    return null;
}
