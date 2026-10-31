"use client";

import Link from "next/link";
import { Alert, Empty, Spin } from "antd";
import { useCreditCardCompareContext } from "@/components/features/credit-card-compare/context";
import ScenarioForm from "@/components/features/credit-card-compare/components/scenario-form";
import BestPicks from "@/components/features/credit-card-compare/components/best-picks";
import CompareTable from "@/components/features/credit-card-compare/components/compare-table";
import CardVerdicts from "@/components/features/credit-card-compare/components/card-verdicts";
import { MENU_KEY } from "@/libs/constants/menuKey";

/** Nội dung trang: trạng thái tải/trống, rồi các khối so sánh. */
export default function CompareContent() {
    const { cards, isLoading } = useCreditCardCompareContext();

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <Spin />
            </div>
        );
    }
    if (cards.length === 0) {
        return (
            <Empty description="Chưa có thẻ tín dụng nào">
                <Link href={MENU_KEY.SOURCES_OF_MONEY}>Thêm thẻ ở trang Nguồn tiền</Link>
            </Empty>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {cards.length === 1 ? (
                <Alert
                    type="info"
                    showIcon
                    message="Cần ít nhất 2 thẻ tín dụng để so sánh điểm mạnh/yếu"
                />
            ) : null}
            <ScenarioForm />
            <BestPicks />
            <CompareTable />
            <CardVerdicts />
        </div>
    );
}
