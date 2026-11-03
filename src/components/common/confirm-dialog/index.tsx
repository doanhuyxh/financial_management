"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/shadcn/ui/alert-dialog";
import { cn } from "@/libs/shadcn/utils";

export type ConfirmDialogOptions = {
    title: ReactNode;
    content?: ReactNode;
    okText?: ReactNode;
    cancelText?: ReactNode;
    /** "danger": nút xác nhận màu đỏ (xóa, thu hồi) */
    okType?: "primary" | "danger";
    /** Trả Promise thì nút xác nhận hiện loading và hộp thoại chỉ đóng khi xong */
    onOk?: () => void | Promise<void>;
    onCancel?: () => void;
};

type ConfirmDialogContextValue = {
    confirm: (options: ConfirmDialogOptions) => void;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

/** Hộp thoại xác nhận dùng chung (thay `modal.confirm` của antd). Gọi qua `useConfirmDialog().confirm(...)`. */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
    const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const confirm = useCallback((next: ConfirmDialogOptions) => {
        setOptions(next);
        setLoading(false);
        setOpen(true);
    }, []);

    const handleOpenChange = (nextOpen: boolean) => {
        if (loading) return;
        if (!nextOpen) options?.onCancel?.();
        setOpen(nextOpen);
    };

    const handleOk = async () => {
        if (!options?.onOk) {
            setOpen(false);
            return;
        }
        setLoading(true);
        try {
            await options.onOk();
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const value = useMemo(() => ({ confirm }), [confirm]);
    const isDanger = options?.okType === "danger";

    return (
        <ConfirmDialogContext.Provider value={value}>
            {children}
            <AlertDialog open={open} onOpenChange={handleOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{options?.title}</AlertDialogTitle>
                        {options?.content ? (
                            <AlertDialogDescription>{options.content}</AlertDialogDescription>
                        ) : null}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>{options?.cancelText ?? "Hủy"}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={loading}
                            onClick={(event) => {
                                // Tự đóng sau khi onOk xong, không để Radix đóng ngay khi bấm
                                event.preventDefault();
                                void handleOk();
                            }}
                            className={cn(
                                isDanger &&
                                    "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30",
                            )}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : null}
                            {options?.okText ?? "OK"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmDialogContext.Provider>
    );
}

export function useConfirmDialog() {
    const context = useContext(ConfirmDialogContext);
    if (!context) throw new Error("useConfirmDialog phải dùng trong ConfirmDialogProvider");
    return context;
}
