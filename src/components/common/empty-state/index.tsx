import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
} from "@/components/shadcn/ui/empty";
import { cn } from "@/libs/shadcn/utils";

interface IEmptyStateProps {
    description?: ReactNode;
    /** Nút hành động dưới mô tả (VD: "Thêm chi tiêu") */
    children?: ReactNode;
    icon?: ReactNode;
    className?: string;
}

/** Trạng thái rỗng gọn (thay antd Empty): icon + mô tả + nút (nếu có). */
export default function EmptyState({
    description = "Không có dữ liệu",
    children,
    icon,
    className,
}: IEmptyStateProps) {
    return (
        <Empty className={cn("gap-3 p-4", className)}>
            <EmptyHeader>
                <EmptyMedia variant="icon">{icon ?? <Inbox />}</EmptyMedia>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            {children ? <EmptyContent>{children}</EmptyContent> : null}
        </Empty>
    );
}
