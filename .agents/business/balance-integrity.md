# Toàn vẹn số dư — đối soát, ghi vết rollback, chống gửi trùng

> Nguồn sự thật là code (`balance-reconcile.service.ts`, `server/utils/ledgerBalance.ts`, `safeRollback.ts`, `idempotency.ts`); nếu code khác tài liệu, tin code và sửa tài liệu. Quy tắc `$inc`/rollback: [balance-rules.md](balance-rules.md).

## Sổ cái là sự thật

`balance` / `creditDetails.currentDebt` chỉ là số lưu sẵn. Sự thật là **sổ cái**: Expense (trừ `skipBalanceAdjust`), Income, Transfer, BalanceAdjustment, phí CardRollover. `computeLedgerBalance` (`server/utils/ledgerBalance.ts`) tính lại số đó, cùng bảng delta với lịch sử nguồn ([source-history.md](source-history.md)) — sửa một chỗ thì sửa cả hai:

- Nguồn thường: income − expense − transferOut + transferIn(amount − fee) + adjustment.delta
- Thẻ: expense − income + transferOut − transferIn(amount − fee) + adjustment.delta + rollover.feeAmount

**Sổ cái đầy đủ** (`SourceOfMoney.ledgerCompleteAt`): đặt khi tạo nguồn (kèm BalanceAdjustment `kind = OPENING` nếu số ban đầu ≠ 0) hoặc khi `scripts/backfill-opening-balance.ts --apply` bổ sung số dư ban đầu cho nguồn cũ. Thiếu mốc này thì đối soát chỉ báo, không sửa.

BalanceAdjustment `kind`: `OPENING` (số dư ban đầu) hoặc `MANUAL` (sửa tay trên form; dữ liệu cũ thiếu `kind` coi là MANUAL).

## Đối soát

- **API:** `GET /api/sources-of-money/[id]/reconcile` → `{ stored, ledger, diff = stored − ledger, ledgerComplete, canApply, blockReason?, openIssues }`. `POST` cùng URL `{ expectedStored, expectedLedger }`: chỉ ghi khi cả hai số vẫn bằng số người dùng đã xem (khác → 409), filter `[trackedPath] = stored` nên giao dịch chen giữa cũng 409.
- **Sửa = đặt số lưu về đúng sổ cái**, không tạo BalanceAdjustment (ghi điều chỉnh sẽ làm sổ cái "khớp" với số sai). Ghi một IntegrityIssue `operation = "reconcile"` đã xử lý làm vết và đóng mọi issue mở của nguồn.
- **Không tự sửa** (`blockReason`): `LEDGER_INCOMPLETE` (chưa backfill), `ARCHIVED`, `LEDGER_OUT_OF_RANGE` (sổ cái âm, lẻ, hoặc thẻ vượt hạn mức — cần người xem giao dịch).
- **UI:** modal lịch sử nguồn (`source-reconcile-panel`): nút "Đối soát số dư/dư nợ" → khớp thì báo xanh; lệch thì 3 số + "Sửa về theo sổ" (confirm) hoặc lý do không sửa được.
- **Script:** `scripts/reconcile-balances.ts` (dry-run; `--apply`, `--all`, `--user`) dùng chung `inspectSourceBalance`/`applySourceReconcile`, đọc lại sau 0,5 giây trước khi sửa, in issue mở, mã thoát 1 khi còn lệch.

## Ghi vết rollback lỗi

Mọi bước bù trừ thủ công trong 5 service ghi số dư đi qua `safeRollback(context, fn)`: lỗi thì `console.error` + tạo **IntegrityIssue** (`userId, sourceOfMoneyId, operation, step, amount, originalError, rollbackError, resolvedAt`) rồi **nuốt lỗi** để caller ném lỗi gốc và vẫn chạy các bước bù trừ sau (thứ tự giữ nguyên). Issue mở hiện ở panel đối soát và script; đối soát thành công đóng chúng.

## Chống gửi trùng (Idempotency-Key)

POST `/api/expenses`, `/api/incomes`, `/api/transfers`, `/api/card-rollovers` bọc `withIdempotency` (`server/utils/idempotency.ts`). Không có header thì chạy như thường. Có header (8–100 ký tự `[A-Za-z0-9_-]`): lần đầu giữ chỗ PENDING rồi chạy; **chỉ lưu response thành công**, lỗi thì xóa khóa (sửa body gửi lại cùng khóa được). Gửi lại → trả đúng response cũ kèm `Idempotent-Replayed: true`; đang chạy → 409; cùng khóa khác body → 422; PENDING quá 2 phút coi như bỏ. Collection `idempotencyKeys`, TTL 24 giờ.

MCP (`create_*`) dùng chung lõi `runIdempotent(key, route, body, handler)` với khóa lấy từ tham số `idempotencyKey` thay header ([mcp-write.md](mcp-write.md)).

Client: `useIdempotencyKey` (`libs/hooks/`) trong các hook `useCreateExpense/Income/Transfer/CardRollover` — giữ một khóa tới khi tạo thành công rồi đổi khóa.

## Đầu vào

- Tiền: `parseMoney` (`server/utils/money.ts`) — số nguyên VND, 1 (hoặc 0 với số dư/hạn mức) đến `MAX_MONEY` = 100 nghìn tỷ. Đáo hạn làm tròn (số suy ra từ %) thay vì từ chối. Model có `INTEGER_MONEY_VALIDATOR`. Số dư/dư nợ cũ đang lẻ vẫn sửa tên được; chỉ bắt số nguyên khi ghi số mới. Ô số tiền desktop `precision={0}`.
- Ngày giao dịch: `parseTransactionDate` — không trước 2000-01-01, không quá 1 ngày sau hiện tại.
- Bộ lọc `from`/`to` của danh sách giao dịch: `buildListDateRange` (`server/utils/dayRange.ts`) nhận YYYY-MM-DD hoặc ISO, quy về cả ngày giờ VN, không phụ thuộc TZ server.
