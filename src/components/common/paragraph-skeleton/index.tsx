import { Skeleton } from "@/components/shadcn/ui/skeleton";
import { cn } from "@/libs/shadcn/utils";

/** Khung chờ dạng đoạn văn: một dòng tiêu đề ngắn + `rows` dòng nội dung (thay antd Skeleton `paragraph`). */
export default function ParagraphSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
    return (
        <div className={cn("flex flex-col gap-3 py-1", className)} aria-busy="true">
            <Skeleton className="skeleton-shimmer h-4 w-2/5 animate-none" />
            {Array.from({ length: rows }, (_, index) => (
                <Skeleton
                    key={index}
                    className={cn(
                        "skeleton-shimmer h-3.5 animate-none",
                        index === rows - 1 ? "w-3/5" : "w-full",
                    )}
                />
            ))}
        </div>
    );
}
