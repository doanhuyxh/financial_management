# MCP — ghi dữ liệu (giai đoạn 2)

> Nguồn sự thật là code (`src/server/mcp/registerWriteTool.ts`, `tools/writes.ts`); nếu code khác tài liệu, tin code và sửa tài liệu. Phần đọc, token, route: [mcp.md](mcp.md).

## Scope `write`

- Tạo token có `allowWrite: true` → `scopes = ["read", "write"]`; mặc định chỉ `["read"]`. Không đổi scope của token đã tạo: muốn đổi thì thu hồi rồi tạo token mới.
- UI Cài đặt: công tắc "Cho phép tạo chi tiêu, thu nhập, chuyển tiền" (mặc định tắt, bật thì hiện cảnh báo). Danh sách token có badge "Chỉ đọc" / "Đọc + ghi".
- `createMcpServer(scopes)` **chỉ đăng ký tool ghi khi token có `write`**: token chỉ đọc không thấy tool ghi trong `tools/list`, instructions ghi thêm "This token is read-only". Handler tool ghi vẫn tự kiểm lại scope (chặn ở tool handler, không ở service).

## Tool (chỉ tạo; không sửa, không xóa)

| Tool | Service | Input (ngoài `idempotencyKey`) |
|---|---|---|
| `create_expense` | `ExpensesService.createExpense` | `categoryId`, `sourceOfMoneyId`, `amount`, `note?`, `date?`, `time?`, `cardFeeType?` (trừ `ROLLOVER_FEE`), `foreignFeeType?` |
| `create_income` | `IncomesService.createIncome` | `categoryId`, `sourceOfMoneyId`, `amount`, `note?`, `date?`, `time?` |
| `create_transfer` | `TransfersService.createTransfer` | `fromSourceId`, `toSourceId`, `amount`, `feePercent?`, `feeCategoryId?`, `note?`, `date?`, `time?` |

- Annotations: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true`.
- zod chặn trước: id hex 24 ký tự, `amount` số nguyên dương, `note` ≤ 500 ký tự, `date` `YYYY-MM-DD`, `time` `HH:mm`. Mọi quy tắc nghiệp vụ (số dư/hạn mức, khóa sổ, `parseMoney`/`parseTransactionDate`, thu nhập không vào thẻ, quy tắc chuyển tiền, rollback) **vẫn nằm trong service**, tool không viết lại. Lỗi service trả nguyên `message` cho agent (`isError`).
- Ngày (`toTransactionDate`): không có `date`, hoặc `date` là hôm nay (giờ VN) mà không có `time` → để trống, service dùng thời điểm hiện tại; ngày khác không có giờ → 12:00 giờ VN; có `time` → đúng giờ đó (+07:00).

## Chống tạo trùng

- `idempotencyKey` **bắt buộc** (8–100 ký tự `[A-Za-z0-9_-]`). Tool chạy qua `runIdempotent(key, route, input, handler)` — lõi tách từ `withIdempotency` (web vẫn gọi qua wrapper đọc header), cùng collection `idempotencyKeys`, cùng `route` với web (`expense.create`, `income.create`, `transfer.create`). Hash body là input của tool **không gồm** khóa.
- Gọi lại cùng khóa + cùng input → trả đúng kết quả lần đầu, không ghi thêm; cùng khóa khác input → lỗi; lỗi thì khóa được giải phóng (sửa input gửi lại cùng khóa được). Chi tiết: [balance-integrity.md](balance-integrity.md).

## Ghi vết

- Giao dịch tạo qua MCP ghi một dòng `transactionAudits` với `action: "CREATE"`, `before: {}`, `after` = snapshot, `via: "mcp"`, `tokenId` (`recordAgentCreateAudit`, gọi trong 3 service tạo, chỉ ghi khi `getAuthContext()?.via === "mcp"`). Tạo trên web **không** ghi.
- Mọi dòng audit (kể cả sửa/xóa) nay có `via` (`web` mặc định) và `tokenId` lấy từ auth context. UI tab Lịch sử: badge "Tạo" + "qua agent".

## Dữ liệu đổi từ ngoài app

App không biết khi agent ghi. `useGetSourcesOfMoney` bật `refetchOnWindowFocus` (vẫn theo staleTime 5 phút); các list khác stale 30 giây nên mở lại trang là thấy.

## Chưa làm / không làm

- Sửa/xóa giao dịch, đáo hạn, điều chỉnh số dư, `applyReconcile` qua MCP: chưa làm, cần user duyệt riêng.
- OAuth cho Claude Desktop / claude.ai connector: chưa làm.

Test: `src/server/__tests__/mcp-write.test.ts`.
