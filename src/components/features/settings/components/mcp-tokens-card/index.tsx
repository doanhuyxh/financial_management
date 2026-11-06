"use client";

import { useState } from "react";
import { Bot, Copy, KeyRound, PenLine, Trash2, TriangleAlert, X } from "lucide-react";
import ChoiceChips from "@/components/common/choice-chips";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/ui/alert";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/shadcn/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/shadcn/ui/empty";
import { Input } from "@/components/shadcn/ui/input";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { Switch } from "@/components/shadcn/ui/switch";
import { useSettingsContext } from "@/components/features/settings/context";
import { notification } from "@/libs/hooks/useAppFeedback";
import {
    DEFAULT_MCP_TOKEN_EXPIRY_DAYS,
    MCP_CLIENT_SNIPPETS,
    MCP_ENDPOINT_PATH,
    MCP_TOKEN_EXPIRY_OPTIONS,
    MCP_TOKEN_LABEL_MAX_LENGTH,
    McpTokenScope,
    type IMcpTokenData,
    type McpTokenExpiryDays,
} from "@/libs/interfaces/mcpTokensData";

const NEVER = "never";
/** Chỗ điền token trong snippet khi chưa có token vừa tạo */
const TOKEN_PLACEHOLDER = "<TOKEN>";
const CLIENT_CHOICES = MCP_CLIENT_SNIPPETS.map((client) => ({ value: client.id, label: client.label }));

// ChoiceChips cần value chuỗi nên "không hạn" dùng chuỗi riêng
const EXPIRY_CHOICES = MCP_TOKEN_EXPIRY_OPTIONS.map((option) => ({
    value: option.value === null ? NEVER : String(option.value),
    label: option.label,
}));

function toExpiryDays(value: string): McpTokenExpiryDays {
    return value === NEVER ? null : (Number(value) as McpTokenExpiryDays);
}

function formatDateTime(value?: string | null) {
    return value
        ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
        : "—";
}

async function copyText(text: string, label: string) {
    try {
        await navigator.clipboard.writeText(text);
        notification.success({ title: `Đã sao chép ${label}` });
    } catch {
        notification.error({ title: "Không sao chép được, hãy chọn và copy tay" });
    }
}

function CopyRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex items-start gap-2">
                <pre
                    className={`min-w-0 flex-1 rounded-md bg-muted px-2 py-1.5 font-mono text-xs ${
                        multiline ? "overflow-x-auto whitespace-pre" : "whitespace-pre-wrap break-all"
                    }`}
                >
                    {value}
                </pre>
                <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Sao chép ${label}`}
                    onClick={() => copyText(value, label.toLowerCase())}
                >
                    <Copy />
                </Button>
            </div>
        </div>
    );
}

function TokenItem({
    token,
    onRevoke,
}: {
    token: IMcpTokenData;
    onRevoke: (token: IMcpTokenData) => void;
}) {
    return (
        <li className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
            <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="truncate">{token.label || "Token không tên"}</span>
                    <code className="font-mono text-xs text-muted-foreground">{token.prefix}…</code>
                    {token.scopes.includes(McpTokenScope.WRITE) ? (
                        <Badge variant="outline">Đọc + ghi</Badge>
                    ) : (
                        <Badge variant="secondary">Chỉ đọc</Badge>
                    )}
                    {token.isExpired ? <Badge variant="secondary">Hết hạn</Badge> : null}
                </span>
                <span>Tạo lúc {formatDateTime(token.createdAt)}</span>
                <span>{token.expiresAt ? `Hết hạn ${formatDateTime(token.expiresAt)}` : "Không hạn"}</span>
                <span>
                    {token.lastUsedAt ? `Dùng lần cuối ${formatDateTime(token.lastUsedAt)}` : "Chưa dùng"}
                </span>
            </div>
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Thu hồi token"
                title="Thu hồi token"
                onClick={() => onRevoke(token)}
            >
                <Trash2 className="text-destructive" />
            </Button>
        </li>
    );
}

/** Tạo / thu hồi token cho agent đọc dữ liệu qua MCP. Nghiệp vụ: .agents/business/mcp.md */
export default function McpTokensCard() {
    const {
        mcpTokens,
        isMcpTokensLoading,
        isCreatingMcpToken,
        isRevokingAllMcpTokens,
        createdMcpToken,
        handleCreateMcpToken,
        handleRevokeMcpToken,
        handleRevokeAllMcpTokens,
        clearCreatedMcpToken,
    } = useSettingsContext();
    const [label, setLabel] = useState("");
    const [expiry, setExpiry] = useState(String(DEFAULT_MCP_TOKEN_EXPIRY_DAYS));
    const [clientId, setClientId] = useState(CLIENT_CHOICES[0].value);
    const [allowWrite, setAllowWrite] = useState(false);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const endpoint = `${origin}${MCP_ENDPOINT_PATH}`;
    const client = MCP_CLIENT_SNIPPETS.find((item) => item.id === clientId) ?? MCP_CLIENT_SNIPPETS[0];
    const snippet = client.build(origin, createdMcpToken?.token ?? TOKEN_PLACEHOLDER);

    const handleCreate = async () => {
        const ok = await handleCreateMcpToken({
            label: label.trim() || undefined,
            expiresInDays: toExpiryDays(expiry),
            allowWrite,
        });
        if (ok) {
            setLabel("");
            setAllowWrite(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="size-4" />
                    Kết nối agent (MCP)
                </CardTitle>
                <CardDescription>
                    Cho agent AI (Claude Code, Codex…) đọc dữ liệu tài chính của bạn qua MCP, và nếu
                    bạn bật, được <strong>tạo</strong> chi tiêu, thu nhập, chuyển tiền. Ai có token đều
                    đọc được toàn bộ nguồn tiền và giao dịch: giữ token như mật khẩu.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {createdMcpToken ? (
                    <Alert>
                        <KeyRound />
                        <AlertTitle className="flex items-center justify-between gap-2">
                            Đã tạo token. Sao chép ngay: token chỉ hiện một lần.
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Đóng"
                                onClick={clearCreatedMcpToken}
                            >
                                <X />
                            </Button>
                        </AlertTitle>
                        <AlertDescription className="flex w-full flex-col gap-3">
                            <CopyRow label="Token" value={createdMcpToken.token} />
                            <CopyRow label="URL" value={endpoint} />
                        </AlertDescription>
                    </Alert>
                ) : null}

                <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold">Cấu hình cho agent</h4>
                    <ChoiceChips options={CLIENT_CHOICES} value={clientId} onChange={setClientId} />
                    <CopyRow
                        label={client.kind === "command" ? "Lệnh" : "Nội dung file cấu hình"}
                        value={snippet}
                        multiline={client.kind === "file"}
                    />
                    <p className="text-xs text-muted-foreground">
                        {client.hint}
                        {!createdMcpToken && snippet.includes(TOKEN_PLACEHOLDER)
                            ? ` Thay ${TOKEN_PLACEHOLDER} bằng token của bạn (tạo token mới nếu không còn giữ).`
                            : null}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="mcp-token-label" className="text-sm text-muted-foreground">
                        Tên token (để bạn tự nhận biết)
                    </label>
                    <Input
                        id="mcp-token-label"
                        value={label}
                        maxLength={MCP_TOKEN_LABEL_MAX_LENGTH}
                        placeholder="Ví dụ: Claude Code trên MacBook"
                        onChange={(event) => setLabel(event.target.value)}
                    />
                    <ChoiceChips
                        label="Hạn dùng:"
                        options={EXPIRY_CHOICES}
                        value={expiry}
                        onChange={setExpiry}
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={allowWrite} onCheckedChange={setAllowWrite} />
                        <PenLine className="size-4 text-muted-foreground" />
                        Cho phép tạo chi tiêu, thu nhập, chuyển tiền
                    </label>
                    {allowWrite ? (
                        <Alert variant="destructive">
                            <TriangleAlert />
                            <AlertTitle>Agent sẽ thay đổi được số dư của bạn</AlertTitle>
                            <AlertDescription>
                                Agent chỉ tạo được giao dịch mới (không sửa, không xóa) và vẫn bị chặn bởi
                                số dư, hạn mức, khóa sổ. Mỗi giao dịch agent tạo hiện trong tab Lịch sử
                                với nhãn &quot;qua agent&quot;. Chỉ bật cho agent bạn tin.
                            </AlertDescription>
                        </Alert>
                    ) : null}
                    <div>
                        <Button onClick={handleCreate} disabled={isCreatingMcpToken}>
                            {isCreatingMcpToken ? (
                                <Spinner data-icon="inline-start" />
                            ) : (
                                <KeyRound data-icon="inline-start" />
                            )}
                            Tạo token
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold">Token đang hoạt động</h4>
                        {mcpTokens.length > 0 ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRevokeAllMcpTokens}
                                disabled={isRevokingAllMcpTokens}
                            >
                                Thu hồi tất cả
                            </Button>
                        ) : null}
                    </div>
                    {isMcpTokensLoading ? (
                        <Spinner />
                    ) : mcpTokens.length === 0 ? (
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyTitle>Chưa có token</EmptyTitle>
                                <EmptyDescription>
                                    Tạo token rồi thêm server MCP vào agent với URL {endpoint}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {mcpTokens.map((token) => (
                                <TokenItem
                                    key={token._id}
                                    token={token}
                                    onRevoke={handleRevokeMcpToken}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
