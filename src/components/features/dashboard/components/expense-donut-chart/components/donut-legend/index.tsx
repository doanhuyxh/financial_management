export type DonutLegendItem = {
    key: string;
    name: string;
    color: string;
};

interface IDonutLegendProps {
    items: DonutLegendItem[];
}

/** Names only — amounts and shares are shown in the chart tooltip. */
export default function DonutLegend({ items }: IDonutLegendProps) {
    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 2xl:flex-col">
            {items.map((item) => (
                <li key={item.key} className="flex items-start gap-2 text-sm">
                    <span
                        aria-hidden
                        className="mt-1.5 size-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="wrap-break-word">{item.name}</span>
                </li>
            ))}
        </ul>
    );
}
