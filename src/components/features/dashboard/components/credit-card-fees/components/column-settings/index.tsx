"use client";

import { useState } from "react";
import { Button, Checkbox, Modal } from "antd";
import { Settings2 } from "lucide-react";

export interface IColumnOption {
    key: string;
    label: string;
}

/** Nút mở modal chọn cột hiển thị; lưu theo danh sách cột bị ẩn. */
export default function ColumnSettings({
    options,
    hiddenKeys,
    onChange,
}: {
    options: IColumnOption[];
    hiddenKeys: string[];
    onChange: (hiddenKeys: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<string[]>([]);

    const visibleDraft = options.map((o) => o.key).filter((key) => !draft.includes(key));

    const handleOpen = () => {
        setDraft(hiddenKeys);
        setOpen(true);
    };

    const handleOk = () => {
        onChange(draft);
        setOpen(false);
    };

    return (
        <>
            <Button
                size="small"
                icon={<Settings2 className="size-4" />}
                onClick={handleOpen}
                aria-label="Cấu hình cột"
            >
                Cột
            </Button>
            <Modal
                title="Chọn cột hiển thị"
                open={open}
                onOk={handleOk}
                onCancel={() => setOpen(false)}
                okText="Lưu"
                cancelText="Hủy"
                width={380}
                footer={(_, { OkBtn, CancelBtn }) => (
                    <div className="flex items-center justify-between gap-2">
                        <Button type="link" className="px-0" onClick={() => setDraft([])}>
                            Hiện tất cả
                        </Button>
                        <div className="flex gap-2">
                            <CancelBtn />
                            <OkBtn />
                        </div>
                    </div>
                )}
            >
                <p className="mb-3 text-xs text-muted-foreground">
                    Cột &quot;Thẻ&quot; và nút &quot;Ghi phí&quot; luôn hiển thị.
                </p>
                <Checkbox.Group
                    className="flex flex-col gap-2"
                    value={visibleDraft}
                    options={options.map((o) => ({ label: o.label, value: o.key }))}
                    onChange={(checked) =>
                        setDraft(
                            options
                                .map((o) => o.key)
                                .filter((key) => !checked.includes(key)),
                        )
                    }
                />
            </Modal>
        </>
    );
}
