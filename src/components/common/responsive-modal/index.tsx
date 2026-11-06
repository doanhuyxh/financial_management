"use client";

import { createContext, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/shadcn/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/shadcn/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/shadcn/ui/drawer";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useIsMobile } from "@/libs/hooks/use-mobile";
import { useKeyboardInset } from "@/libs/hooks/useKeyboardInset";
import { cn } from "@/libs/shadcn/utils";

/**
 * Đặt class này lên FormField (hoặc phần tử bao ô nhập) để modal focus vào ô đó sau khi mở,
 * thay vì nút đóng (X) mà Dialog focus mặc định.
 */
export const MODAL_AUTOFOCUS_CLASS = "js-modal-autofocus";

/**
 * Chỗ trống ở đầu footer Drawer (chỉ trên mobile) để component con portal vào, VD bàn phím số của AmountInput.
 * null khi không ở trong ResponsiveModal mobile.
 */
export const ModalFooterSlotContext = createContext<HTMLElement | null>(null);

const AUTOFOCUS_SELECTOR = `.${MODAL_AUTOFOCUS_CLASS} input, .${MODAL_AUTOFOCUS_CLASS} textarea, .${MODAL_AUTOFOCUS_CLASS} button`;

/** Focus lại ô có MODAL_AUTOFOCUS_CLASS (VD: sau khi lưu với "Tạo tiếp"). */
export function focusModalField() {
    requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR)?.focus();
    });
}

type FooterButtons = { OkBtn: () => ReactNode; CancelBtn: () => ReactNode };

/** Footer: `null` ẩn, node thay hẳn, hàm nhận `{ OkBtn, CancelBtn }` để sắp xếp lại. */
export type ResponsiveModalFooter = ReactNode | ((originNode: null, buttons: FooterButtons) => ReactNode);

type ResponsiveModalProps = {
    open: boolean;
    title?: ReactNode;
    onCancel?: () => void;
    onOk?: () => void;
    confirmLoading?: boolean;
    okText?: ReactNode;
    cancelText?: ReactNode;
    footer?: ResponsiveModalFooter;
    /** Giữ để tương thích; nội dung luôn unmount khi đóng. */
    destroyOnHidden?: boolean;
    /** false: click ra ngoài (mask) không đóng. */
    maskClosable?: boolean;
    width?: number;
    children?: ReactNode;
};

/** Modal giữa màn hình trên desktop, Drawer trượt từ đáy trên mobile (API giống nhau). */
export default function ResponsiveModal({
    open,
    title,
    onCancel,
    onOk,
    confirmLoading,
    okText = "OK",
    cancelText = "Hủy",
    footer,
    maskClosable,
    width = 520,
    children,
}: ResponsiveModalProps) {
    const isMobile = useIsMobile();
    const bodyRef = useRef<HTMLDivElement>(null);
    const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);
    const keyboard = useKeyboardInset(isMobile && open);

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) onCancel?.();
    };

    const okButton = (
        <Button type="button" disabled={confirmLoading} onClick={onOk} className="w-full md:w-auto">
            {confirmLoading ? <Spinner data-icon="inline-start" /> : null}
            {okText}
        </Button>
    );
    const cancelButton = (
        <Button type="button" variant="outline" onClick={onCancel} className="w-full md:w-auto">
            {cancelText}
        </Button>
    );

    let footerNode: ReactNode;
    if (footer === null) {
        footerNode = null;
    } else if (typeof footer === "function") {
        footerNode = footer(null, { OkBtn: () => okButton, CancelBtn: () => cancelButton });
    } else if (footer !== undefined) {
        footerNode = footer;
    } else if (isMobile) {
        // 1 hàng để footer không chiếm chỗ của form: Hủy hẹp bên trái, nút chính rộng bên phải
        footerNode = (
            <div className="grid grid-cols-[1fr_2fr] gap-2">
                {cancelButton}
                {okButton}
            </div>
        );
    } else {
        footerNode = (
            <div className="flex items-center justify-end gap-2">
                {cancelButton}
                {okButton}
            </div>
        );
    }

    const interactOutside = maskClosable === false ? (event: Event) => event.preventDefault() : undefined;

    if (isMobile) {
        // Bàn phím hệ thống đang mở (ô ghi chú, ô tìm trong Combobox...): đẩy Drawer lên trên bàn phím
        // và cho cao vừa phần màn hình còn thấy, để footer không bị che.
        const keyboardOpen = keyboard.bottom > 0;
        const contentStyle: CSSProperties = keyboardOpen
            ? { height: keyboard.visibleHeight, bottom: keyboard.bottom }
            : { height: "90dvh" };

        return (
            <Drawer
                open={open}
                onOpenChange={handleOpenChange}
                direction="bottom"
                repositionInputs={false}
                autoFocus={false}
                dismissible={maskClosable !== false}
            >
                <DrawerContent
                    style={contentStyle}
                    className="max-h-none! bg-card"
                    onInteractOutside={interactOutside}
                    // Mobile: không tự focus để bàn phím hệ thống không bật lên che form ngay khi mở
                    onOpenAutoFocus={(event) => event.preventDefault()}
                >
                    <DrawerHeader className="border-b border-border py-3 text-left">
                        <DrawerTitle className={cn(!title && "sr-only")}>{title ?? "Hộp thoại"}</DrawerTitle>
                        <DrawerDescription className="sr-only">Hộp thoại</DrawerDescription>
                    </DrawerHeader>
                    <div ref={bodyRef} className="scrollbar-theme min-h-0 flex-1 overflow-y-auto px-4 py-3">
                        <ModalFooterSlotContext.Provider value={footerSlot}>{children}</ModalFooterSlotContext.Provider>
                    </div>
                    {footerNode === null ? null : (
                        <div className="pb-safe border-t border-border px-4 pt-2">
                            <div ref={setFooterSlot} />
                            {footerNode}
                        </div>
                    )}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                style={{ "--modal-width": `${width}px` } as CSSProperties}
                // Cách mép trên 5% màn hình; thân modal giới hạn chiều cao để cả modal nằm gọn trong màn hình,
                // chỉ thân modal cuộn, tránh cuộn đôi cùng trang trên màn hình thấp.
                className="top-[5dvh] translate-y-0 gap-0 bg-card p-0 sm:max-w-(--modal-width)"
                onInteractOutside={interactOutside}
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    const field = bodyRef.current?.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR);
                    (field ?? bodyRef.current)?.focus();
                }}
            >
                <DialogHeader className="border-b border-border px-4 py-3 pr-12">
                    <DialogTitle className={cn(!title && "sr-only")}>{title ?? "Hộp thoại"}</DialogTitle>
                    <DialogDescription className="sr-only">Hộp thoại</DialogDescription>
                </DialogHeader>
                <div
                    ref={bodyRef}
                    tabIndex={-1}
                    className="scrollbar-theme max-h-[calc(90dvh-140px)] overflow-y-auto px-4 py-3 outline-none"
                >
                    {children}
                </div>
                {footerNode === null ? null : (
                    <div className="border-t border-border px-4 py-3">{footerNode}</div>
                )}
            </DialogContent>
        </Dialog>
    );
}
