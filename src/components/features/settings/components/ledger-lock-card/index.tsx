"use client";

import { Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/shadcn/ui/card";
import { Input } from "@/components/shadcn/ui/input";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useSettingsContext } from "@/components/features/settings/context";
import { formatDate } from "@/libs/utils/formatDate";

/** Đặt / bỏ mốc khóa sổ. Nghiệp vụ: .agents/business/ledger-lock-audit.md */
export default function LedgerLockCard() {
    const {
        savedLockDay,
        lockInput,
        maxLockDay,
        isSettingsLoading,
        isSavingLock,
        setLockInput,
        handleSaveLock,
        handleClearLock,
    } = useSettingsContext();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="size-4" />
                    Khóa sổ
                </CardTitle>
                <CardDescription>
                    Giao dịch có ngày trước mốc khóa không thêm, sửa hoặc xóa được. Dùng sau khi đã
                    đối chiếu xong sao kê một kỳ.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {isSettingsLoading ? (
                    <Spinner />
                ) : (
                    <p className="text-sm">
                        {savedLockDay ? (
                            <>
                                Đang khóa mọi giao dịch <strong>trước {formatDate(savedLockDay)}</strong>
                            </>
                        ) : (
                            <span className="text-muted-foreground">Chưa khóa sổ</span>
                        )}
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="ledger-lock-day" className="text-sm text-muted-foreground">
                        Khóa trước ngày
                    </label>
                    <Input
                        id="ledger-lock-day"
                        type="date"
                        min="2000-01-01"
                        max={maxLockDay}
                        value={lockInput}
                        onChange={(event) => setLockInput(event.target.value)}
                        className="w-44"
                    />
                    <Button
                        onClick={handleSaveLock}
                        disabled={isSavingLock || !lockInput || lockInput === savedLockDay}
                    >
                        {isSavingLock ? <Spinner data-icon="inline-start" /> : null}
                        Lưu mốc khóa
                    </Button>
                    {savedLockDay ? (
                        <Button variant="outline" onClick={handleClearLock} disabled={isSavingLock}>
                            <LockOpen data-icon="inline-start" />
                            Bỏ khóa
                        </Button>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
