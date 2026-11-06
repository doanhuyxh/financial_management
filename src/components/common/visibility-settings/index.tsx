"use client";

import { useId, useState } from "react";
import { Settings2 } from "lucide-react";
import ResponsiveModal from "@/components/common/responsive-modal";
import { Button } from "@/components/shadcn/ui/button";
import { Checkbox } from "@/components/shadcn/ui/checkbox";
import { Label } from "@/components/shadcn/ui/label";

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
    const idPrefix = useId();

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

    /** Bật/tắt một mục; danh sách ẩn chỉ giữ key có trong `options` (như Checkbox.Group cũ) */
    const toggle = (key: string, visible: boolean) => {
        const nextVisible = visible ? [...visibleDraft, key] : visibleDraft.filter((item) => item !== key);
        setDraft(allKeys.filter((item) => !nextVisible.includes(item)));
    };

    return (
        <>
            <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
                <Settings2 data-icon="inline-start" className="size-4" />
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
                        <Button type="button" variant="link" className="px-0" onClick={() => setDraft([])}>
                            Hiện tất cả
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="button" disabled={!canSave} onClick={handleOk}>
                                Lưu
                            </Button>
                        </div>
                    </div>
                )}
            >
                {note ? <p className="mb-3 text-xs text-muted-foreground">{note}</p> : null}
                <div className="flex flex-col gap-2">
                    {options.map((option) => {
                        const id = `${idPrefix}-${option.key}`;
                        return (
                            <div key={option.key} className="flex items-center gap-2">
                                <Checkbox
                                    id={id}
                                    checked={!draft.includes(option.key)}
                                    onCheckedChange={(checked) => toggle(option.key, checked === true)}
                                />
                                <Label htmlFor={id} className="cursor-pointer font-normal">
                                    {option.label}
                                </Label>
                            </div>
                        );
                    })}
                </div>
                {!canSave ? (
                    <p className="mt-3 text-xs text-destructive">Chọn ít nhất {minVisible} mục.</p>
                ) : null}
            </ResponsiveModal>
        </>
    );
}
