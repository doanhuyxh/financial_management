"use client";

import { useState } from "react";
import { Button, Checkbox } from "antd";
import { Settings2 } from "lucide-react";
import ResponsiveModal from "@/components/common/responsive-modal";

export interface IVisibilityOption {
    key: string;
    label: string;
}

/**
 * Nút mở modal chọn mục hiển thị (cột, thẻ...). Lưu theo danh sách mục bị ẩn
 * để mục mới thêm sau mặc định vẫn hiện.
 */
export default function VisibilitySettings({
    options,
    hiddenKeys,
    onChange,
    buttonLabel,
    title,
    note,
    minVisible = 0,
}: {
    options: IVisibilityOption[];
    hiddenKeys: string[];
    onChange: (hiddenKeys: string[]) => void;
    buttonLabel: string;
    title: string;
    note?: string;
    /** Số mục tối thiểu phải chọn; ít hơn thì không cho lưu. */
    minVisible?: number;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<string[]>([]);

    const allKeys = options.map((o) => o.key);
    const visibleDraft = allKeys.filter((key) => !draft.includes(key));
    const canSave = visibleDraft.length >= minVisible;

    const handleOpen = () => {
        setDraft(hiddenKeys);
        setOpen(true);
    };

    const handleOk = () => {
        if (!canSave) return;
        onChange(draft);
        setOpen(false);
    };

    return (
        <>
            <Button size="small" icon={<Settings2 className="size-4" />} onClick={handleOpen}>
                {buttonLabel}
            </Button>
            <ResponsiveModal
                title={title}
                open={open}
                onOk={handleOk}
                onCancel={() => setOpen(false)}
                width={380}
                footer={() => (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button type="link" className="px-0" onClick={() => setDraft([])}>
                            Hiện tất cả
                        </Button>
                        <div className="flex gap-2">
                            <Button onClick={() => setOpen(false)}>Hủy</Button>
                            <Button type="primary" disabled={!canSave} onClick={handleOk}>
                                Lưu
                            </Button>
                        </div>
                    </div>
                )}
            >
                {note ? <p className="mb-3 text-xs text-muted-foreground">{note}</p> : null}
                <Checkbox.Group
                    className="flex flex-col gap-2"
                    value={visibleDraft}
                    options={options.map((o) => ({ label: o.label, value: o.key }))}
                    onChange={(checked) =>
                        setDraft(allKeys.filter((key) => !checked.includes(key)))
                    }
                />
                {!canSave ? (
                    <p className="mt-3 text-xs text-destructive">Chọn ít nhất {minVisible} mục.</p>
                ) : null}
            </ResponsiveModal>
        </>
    );
}
