# Khóa sổ và lịch sử sửa/xóa giao dịch

> Code: `src/server/utils/ledgerLock.ts`, `src/server/utils/transactionAudit.ts`, `settings.service.ts`, `transaction-audits.service.ts`. UI: trang `/settings` (`features/settings`). Test: `src/server/__tests__/ledger-lock-audit.test.ts`.

## Khóa sổ

- `User.ledgerLockedBefore` (Date, đầu ngày giờ VN; `null` = không khóa). Đặt/bỏ qua `GET/PUT /api/settings` với body `{ ledgerLockedBefore: "YYYY-MM-DD" | null }`.
- Đầu vào (`parseLedgerLock`): đúng dạng `YYYY-MM-DD`, không trước năm 2000, xa nhất là **ngày mai** (tức khóa tới hết hôm nay). Sai → 400.
- Giao dịch có ngày **trước** mốc (`date < ledgerLockedBefore`) không tạo, sửa, xóa được → 400 "Kỳ đã khóa sổ: không thể thêm, sửa hoặc xóa giao dịch trước ngày DD/MM/YYYY".

| Thao tác | Ngày được kiểm |
|---|---|
| Tạo chi tiêu / thu nhập | `spentAt` / `receivedAt` mới |
| Sửa chi tiêu / thu nhập | **cả** ngày cũ và ngày mới (không dời giao dịch vào hoặc ra khỏi kỳ khóa) |
| Xóa chi tiêu / thu nhập | ngày cũ |
| Tạo / xóa chuyển tiền | `transferredAt` — kiểm trong lõi `createTransferRecord` / `deleteTransferRecord`, nên cũng áp cho khoản tự trả của đáo hạn |
| Tạo / xóa đáo hạn | `rolledAt` |

- Kiểm tra chạy **trước** mọi bước ghi số dư, nên không cần rollback.
- Không áp cho: sửa số dư tay trên form nguồn tiền (BalanceAdjustment ghi ngày hiện tại), đối soát, hành trình đáo hạn.
- Client: `QuickDateField` (`common/quick-date-field`) đọc mốc qua `useLedgerLock()` (`customHooks/useSettings.ts`), không cho chọn ngày trước mốc, ẩn chip "Hôm nay/Hôm qua" nếu bị khóa, hiện dòng "Đã khóa sổ trước …". Sửa giao dịch đã nằm trong kỳ khóa thì báo ngay dưới ô ngày. Server vẫn là chốt chặn.

## Lịch sử sửa/xóa (`transactionAudits`)

- Một dòng cho mỗi lần **sửa** (chi tiêu, thu nhập) hoặc **xóa** (chi tiêu, thu nhập, chuyển tiền, đáo hạn) **thành công**. Tạo mới không ghi. Chuyển tiền và đáo hạn không có sửa.
- `before` / `after` (null khi xóa) là snapshot các trường nghiệp vụ (`toAuditSnapshot`): `amount`, `feeAmount`, `paymentAmount`, `date` (ngày giao dịch, ISO), `note`, `categoryId`, `sourceOfMoneyId`, `fromSourceId`, `toSourceId`, `cardFeeType`, `provider`.
- `via` (`web`/`mcp`) và `tokenId` lấy từ auth context. Giao dịch **tạo qua agent MCP** ghi thêm `action: CREATE` (`before: {}`, `after` = snapshot, `recordAgentCreateAudit`); tạo trên web không ghi ([mcp-write.md](mcp-write.md)). UI hiện badge "Tạo" + "qua agent".
- Ghi bằng `recordTransactionAudit` **sau** khi thao tác chính xong; lỗi ghi chỉ `console.warn`, không làm hỏng response.
- Xóa đáo hạn kèm `deletePayment=1` ghi 2 dòng: `CARD_ROLLOVER` và `TRANSFER` (khoản tự trả). `deleteTransferRecord` tự nó **không** ghi lịch sử vì còn được dùng để rollback khi tạo đáo hạn lỗi; nơi gọi tự ghi.
- Không ghi cho bản ghi phụ: fee expense của chuyển tiền / đáo hạn (xóa theo bản ghi gốc).
- `GET /api/transaction-audits?page&limit&kind` (mặc định 20/trang, mới nhất trước) trả thêm `names`: id danh mục/nguồn có trong trang → tên (kể cả đã lưu trữ). UI hiện trường đã đổi dạng "cũ → mới"; id không còn tên hiện "(đã xóa)".
- Mutation sửa/xóa chi, thu, chuyển tiền, đáo hạn đều invalidate `TRANSACTION_AUDITS`.
