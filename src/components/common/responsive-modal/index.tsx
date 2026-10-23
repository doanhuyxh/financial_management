"use client";

import type { ReactNode } from "react";
import { Button, Drawer, Modal } from "antd";
import type { ModalProps } from "antd";
import { useIsMobile } from "@/libs/hooks/use-mobile";

type ResponsiveModalProps = {
    open: boolean;
    title?: ReactNode;
    onCancel?: () => void;
    onOk?: () => void;
    confirmLoading?: boolean;
    okText?: ReactNode;
    cancelText?: ReactNode;
    footer?: ModalProps["footer"];
    destroyOnHidden?: boolean;
    width?: number;
    children?: ReactNode;
};

export default function ResponsiveModal({
    open,
    title,
    onCancel,
    onOk,
    confirmLoading,
    okText = "OK",
    cancelText = "Hủy",
    footer,
    destroyOnHidden,
    width = 520,
    children,
}: ResponsiveModalProps) {
    const isMobile = useIsMobile();

    if (isMobile) {
        const okButton = (
            <Button type="primary" block loading={confirmLoading} onClick={onOk}>
                {okText}
            </Button>
        );
        const cancelButton = (
            <Button block onClick={onCancel}>
                {cancelText}
            </Button>
        );

        let footerNode: ReactNode = (
            <div className="flex flex-col-reverse gap-2 pb-safe">
                {okButton}
                {cancelButton}
            </div>
        );

        if (footer === null) {
            footerNode = null;
        } else if (typeof footer === "function") {
            footerNode = (
                <div className="pb-safe [&_.ant-btn]:w-full">{footer(null, { OkBtn: () => okButton, CancelBtn: () => cancelButton })}</div>
            );
        } else if (footer !== undefined) {
            footerNode = footer;
        }

        return (
            <Drawer
                open={open}
                title={title}
                placement="bottom"
                size="90dvh"
                onClose={onCancel}
                destroyOnHidden={destroyOnHidden}
                styles={{
                    body: { maxHeight: "calc(90dvh - 120px)", overflowY: "auto" },
                }}
                footer={footerNode}
            >
                {children}
            </Drawer>
        );
    }

    return (
        <Modal
            open={open}
            title={title}
            onCancel={onCancel}
            onOk={onOk}
            confirmLoading={confirmLoading}
            okText={okText}
            cancelText={cancelText}
            footer={footer}
            destroyOnHidden={destroyOnHidden}
            width={width}
            // Căn giữa để cả modal (tiêu đề + thân + footer ≈ thân + 116px) nằm gọn trong
            // màn hình; chỉ thân modal cuộn, tránh cuộn đôi cùng trang trên màn hình thấp.
            centered
            styles={{ body: { maxHeight: "calc(100dvh - 160px)", overflowY: "auto" } }}
        >
            {children}
        </Modal>
    );
}
