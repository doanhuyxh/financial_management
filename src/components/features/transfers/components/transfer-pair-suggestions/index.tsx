"use client";

import { Tag } from "antd";
import { ArrowRight } from "lucide-react";
import type { ITransferPairSuggestion } from "@/libs/interfaces/suggestionsData";
import type { ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";

type TransferPairSuggestionsProps = {
    pairs: ITransferPairSuggestion[] | undefined;
    sources: ISourcesOfMoneyData[];
    fromSourceId?: string;
    toSourceId?: string;
    onSelect: (pair: ITransferPairSuggestion) => void;
};

export default function TransferPairSuggestions({
    pairs,
    sources,
    fromSourceId,
    toSourceId,
    onSelect,
}: TransferPairSuggestionsProps) {
    const sourceNames = new Map(sources.map((item) => [item._id, item.name]));
    const visiblePairs = (pairs ?? []).filter(
        (pair) => sourceNames.has(pair.fromSourceId) && sourceNames.has(pair.toSourceId),
    );

    if (!visiblePairs.length) return null;

    return (
        <div className="mb-4">
            <div className="mb-1.5 text-sm text-neutral-500">Hay chuyển</div>
            <div className="flex flex-wrap gap-y-1.5">
                {visiblePairs.map((pair) => (
                    <Tag.CheckableTag
                        key={`${pair.fromSourceId}:${pair.toSourceId}`}
                        checked={
                            pair.fromSourceId === fromSourceId &&
                            pair.toSourceId === toSourceId
                        }
                        onChange={() => onSelect(pair)}
                    >
                        <span className="inline-flex items-center gap-1">
                            {sourceNames.get(pair.fromSourceId)}
                            <ArrowRight className="size-3" aria-hidden />
                            {sourceNames.get(pair.toSourceId)}
                        </span>
                    </Tag.CheckableTag>
                ))}
            </div>
        </div>
    );
}
