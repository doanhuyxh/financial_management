"use client";

import { ArrowRight } from "lucide-react";
import ChoiceChips from "@/components/common/choice-chips";
import type { ITransferPairSuggestion } from "@/libs/interfaces/suggestionsData";
import type { ISourcesOfMoneyData } from "@/libs/interfaces/sourcesOfMoneyData";

type TransferPairSuggestionsProps = {
    pairs: ITransferPairSuggestion[] | undefined;
    sources: ISourcesOfMoneyData[];
    fromSourceId?: string;
    toSourceId?: string;
    onSelect: (pair: ITransferPairSuggestion) => void;
};

const pairKey = (fromSourceId: string, toSourceId: string) => `${fromSourceId}:${toSourceId}`;

/** Chip các cặp nguồn hay chuyển ("A → B"); bấm chip điền cả nguồn chuyển lẫn nguồn nhận. */
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

    const options = visiblePairs.map((pair) => ({
        value: pairKey(pair.fromSourceId, pair.toSourceId),
        label: (
            <span className="inline-flex items-center gap-1">
                {sourceNames.get(pair.fromSourceId)}
                <ArrowRight className="size-3" aria-hidden />
                {sourceNames.get(pair.toSourceId)}
            </span>
        ),
    }));
    const selected = fromSourceId && toSourceId ? pairKey(fromSourceId, toSourceId) : null;

    return (
        <div>
            <div className="mb-1.5 text-sm text-muted-foreground">Hay chuyển</div>
            <ChoiceChips
                options={options}
                value={selected}
                onChange={(key) => {
                    const pair = visiblePairs.find(
                        (item) => pairKey(item.fromSourceId, item.toSourceId) === key,
                    );
                    if (pair) onSelect(pair);
                }}
            />
        </div>
    );
}
