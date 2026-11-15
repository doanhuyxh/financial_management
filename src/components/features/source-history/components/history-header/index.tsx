"use client";

import { ArrowLeft, Share2 } from "lucide-react";
import Combobox from "@/components/common/combobox";
import Tag from "@/components/common/tag";
import { Button } from "@/components/shadcn/ui/button";
import SourceReconcilePanel from "@/components/features/source-history/components/source-reconcile-panel";
import { useSourceHistoryContext } from "@/components/features/source-history/context";
import { SOURCES_OF_MONEY_TYPE_LABELS } from "@/libs/interfaces/sourcesOfMoneyData";

/** Tên nguồn, đổi nhanh sang nguồn khác, đối soát và chia sẻ. */
export default function HistoryHeader() {
    const { source, sources, isCreditCard, handleBack, handleSelectSource, openShareModal } =
        useSourceHistoryContext();

    if (!source) return null;

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={handleBack}
                        aria-label="Về trang Nguồn tiền"
                    >
                        <ArrowLeft />
                    </Button>
                    <h1 className="truncate text-lg font-semibold">{source.name}</h1>
                    <Tag>{SOURCES_OF_MONEY_TYPE_LABELS[source.type] ?? source.type}</Tag>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Combobox
                        className="w-auto max-w-full min-w-48"
                        value={source._id}
                        onChange={(value) => {
                            if (value) handleSelectSource(value);
                        }}
                        options={sources.map((item) => ({ value: item._id, label: item.name }))}
                        placeholder="Chọn nguồn tiền"
                        aria-label="Đổi nguồn tiền"
                    />
                    <Button type="button" variant="outline" onClick={openShareModal}>
                        <Share2 data-icon="inline-start" className="size-4" />
                        Chia sẻ
                    </Button>
                </div>
            </div>
            <SourceReconcilePanel key={source._id} sourceId={source._id} isCreditCard={isCreditCard} />
        </section>
    );
}
