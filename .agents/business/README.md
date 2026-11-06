# Business logic — Money Manager

> Nghiệp vụ đang chạy. Nguồn sự thật là `src/server/services/*.service.ts`; nếu code khác tài liệu, tin code và sửa tài liệu.
> Stack, luồng dữ liệu, cache, danh sách trang: [architecture.md](../architecture.md). Schema và quy tắc ghi DB: [database.md](../database.md).

## Đọc file nào

| Khi sửa... | Đọc |
|---|---|
| Expense, Income, Transfer, `$inc`/rollback số dư | [balance-rules.md](balance-rules.md) |
| Đối soát sổ cái, IntegrityIssue, Idempotency-Key, `parseMoney`/`parseTransactionDate` | [balance-integrity.md](balance-integrity.md) |
| Khóa sổ (`ledgerLockedBefore`), lịch sử sửa/xóa giao dịch, trang Cài đặt | [ledger-lock-audit.md](ledger-lock-audit.md) |
| CRUD nguồn tiền, điều chỉnh số dư, VietQR, xóa mềm nguồn | [sources-of-money.md](sources-of-money.md) |
| Lịch sử giao dịch nguồn tiền, link chia sẻ public | [source-history.md](source-history.md) |
| Phí thẻ, kỳ sao kê, miễn phí, lãi, `credit-card-fees` API | [credit-card-fees.md](credit-card-fees.md) |
| Đáo hạn thẻ (CardRollover, phí đáo hạn, modal dashboard) | [card-rollover.md](card-rollover.md) |
| Danh mục, `kind` | [categories.md](categories.md) |
| Dashboard (chi tiêu, dòng tiền, tài sản, dư nợ) | [dashboard.md](dashboard.md) |
| Bảng phí thẻ trên dashboard | [dashboard-card-fees.md](dashboard-card-fees.md) |
| Trang so sánh thẻ | [card-compare.md](card-compare.md) |
| Đăng nhập, JWT, proxy, phiên | [auth.md](auth.md) |
| Gợi ý "thường dùng" trong form | [suggestions.md](suggestions.md) |
| MCP server cho agent khác đọc dữ liệu, token cá nhân | [mcp.md](mcp.md) |
| MCP ghi dữ liệu (scope `write`, `create_*`, idempotencyKey) | [mcp-write.md](mcp-write.md) |

Giữ mỗi file ≤ ~8 KB. Vượt thì tách tiếp theo domain con và thêm dòng vào bảng trên và bảng trong `AGENTS.md`.

## Nguyên tắc chung

- Mỗi user chỉ thấy dữ liệu của chính mình (mọi query lọc theo `userId` từ JWT). Ngoại lệ: link chia sẻ public lấy `userId` từ ShareLink, chỉ đọc đúng một nguồn ([source-history.md](source-history.md)); request MCP lấy `userId` từ token cá nhân đã verify; chỉ đọc, trừ token có scope `write` được tạo chi/thu/chuyển ([mcp.md](mcp.md), [mcp-write.md](mcp-write.md)).
- **Cập nhật số dư thẻ tín dụng** luôn đặt điều kiện hạn mức/dư nợ ngay trong filter của `findOneAndUpdate`, để request đồng thời không vượt hạn mức hoặc làm dư nợ âm.
- **Múi giờ:** Asia/Ho_Chi_Minh (+07:00). Dashboard tính theo múi này; PM2 cũng đặt `TZ`.
- **Category** có `kind`: `EXPENSE` (chi tiêu và phí chuyển tiền) hoặc `INCOME` (thu nhập). Xem [categories.md](categories.md).

## Điểm cần lưu ý / nợ kỹ thuật đã biết

1. Rollback thủ công (không transaction) có thể để lại dữ liệu lệch nếu chính bước rollback cũng lỗi, hoặc nếu có request đồng thời. Nay có dấu vết (IntegrityIssue) và đối soát để phát hiện, sửa ([balance-integrity.md](balance-integrity.md)).
2. Fee expense (có `skipBalanceAdjust`) bị khóa sửa/xóa ở trang Chi tiêu để luôn khớp với `feeAmount`/`feeExpenseId` của transfer gốc.
3. Dữ liệu mồ côi từ trước khi có xóa mềm (`archivedAt`) vẫn sửa/xóa được.
4. Sửa trực tiếp số dư/dư nợ trên form nguồn tiền được ghi vào lịch sử điều chỉnh (BalanceAdjustment), nhưng vẫn có thể khiến xóa một giao dịch cũ bị chặn (ví dụ số dư không đủ để xóa income). Sửa số tiền trên cùng nguồn thì chỉ cần đủ phần chênh.
5. Password lưu bcrypt. Token sống 30 ngày. Logout tăng `tokenVersion` nên thu hồi mọi thiết bị.
6. Chuyển tiền không sửa được, chỉ xóa rồi tạo lại.
7. Xóa giao dịch cũ khi số dư/dư nợ không đủ để hoàn vẫn bị chặn — **cố ý**, user không muốn "xóa và ghi điều chỉnh bù" (đừng đề xuất lại). Muốn đóng băng kỳ cũ thì dùng khóa sổ ([ledger-lock-audit.md](ledger-lock-audit.md)).
8. `formatMoney` dùng chung ở `src/libs/utils/formatMoney.ts`. `getRefId` vẫn nằm trong utils của từng feature.
9. **Đang gỡ antd sang shadcn** (quyết định 03/11/2026, giữ giao diện giống hiện tại). Đợt 1 xong: shadcn đủ bộ + Animate UI, thông báo/xác nhận qua `useAppFeedback` (sonner + `confirm-dialog`). Còn lại ~70 file antd: Form (9 form → react-hook-form + zod), Table có sort, Select tìm kiếm, DatePicker, Segmented, Pagination, QRCode, `AntdProvider`/`themeColors.ts`. Thứ tự dự kiến: `common/` → từng feature → gỡ package.
