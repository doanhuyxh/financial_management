"use client";

import { useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { useConfirmDialog, type ConfirmDialogOptions } from "@/components/common/confirm-dialog";

type NotifyOptions = {
    title?: ReactNode;
    /** Tên cũ của `title` (theo antd `message`), giữ để không phải sửa chỗ gọi */
    message?: ReactNode;
    description?: ReactNode;
    /** Giây. Mặc định 3 */
    duration?: number;
};

type NotifyKind = "success" | "error" | "warning" | "info";

const DEFAULT_DURATION_SECONDS = 3;

function show(kind: NotifyKind, options: NotifyOptions) {
    toast[kind](options.title ?? options.message, {
        description: options.description,
        duration: (options.duration ?? DEFAULT_DURATION_SECONDS) * 1000,
    });
}

/**
 * Thông báo góc màn hình (sonner, `<Toaster>` gắn trong AppProviders).
 * Object ổn định theo module nên đưa vào dependency của useCallback cũng không đổi.
 */
export const notification = {
    success: (options: NotifyOptions) => show("success", options),
    error: (options: NotifyOptions) => show("error", options),
    warning: (options: NotifyOptions) => show("warning", options),
    info: (options: NotifyOptions) => show("info", options),
};

/**
 * Thay cho `App.useApp()` của antd: `notification.*` để báo kết quả thao tác,
 * `modal.confirm` để hỏi trước khi xóa/thu hồi.
 */
export function useAppFeedback() {
    const { confirm } = useConfirmDialog();
    const modal = useMemo(() => ({ confirm: (options: ConfirmDialogOptions) => confirm(options) }), [confirm]);
    return { notification, modal };
}
