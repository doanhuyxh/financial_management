# Business logic — Money Manager

> Nghiệp vụ đang chạy. Nguồn sự thật là `src/server/services/*.service.ts`; nếu code khác tài liệu, tin code và sửa tài liệu.
> Stack, luồng dữ liệu, cache, danh sách trang: [architecture.md](../architecture.md). Schema và quy tắc ghi DB: [database.md](../database.md).

## Đọc file nào

| Khi sửa... | Đọc |
|---|---|
| Expense, Income, Transfer, `$inc`/rollback số dư | [balance-rules.md](balance-rules.md) |
| CRUD nguồn tiền, điều chỉnh số dư, VietQR, xóa mềm nguồn | [sources-of-money.md](sources-of-money.md) |
| Phí thẻ, kỳ sao kê, miễn phí, lãi, `credit-card-fees` API | [credit-card-fees.md](credit-card-fees.md) |
| Danh mục, `kind` | [categories.md](categories.md) |
| Dashboard (chi tiêu, dòng tiền, tài sản, dư nợ, bảng phí) | [dashboard.md](dashboard.md) |
| Trang so sánh thẻ | [card-compare.md](card-compare.md) |
| Đăng nhập, JWT, proxy, phiên | [auth.md](auth.md) |
| Gợi ý "thường dùng" trong form | [suggestions.md](suggestions.md) |

Giữ mỗi file ≤ ~8 KB. Vượt thì tách tiếp theo domain con và thêm dòng vào bảng trên và bảng trong `AGENTS.md`.

## Nguyên tắc chung

- Mỗi user chỉ thấy dữ liệu của chính mình (mọi query lọc theo `userId` từ JWT).
- **Cập nhật số dư thẻ tín dụng** luôn đặt điều kiện hạn mức/dư nợ ngay trong filter của `findOneAndUpdate`, để request đồng thời không vượt hạn mức hoặc làm dư nợ âm.
- **Múi giờ:** Asia/Ho_Chi_Minh (+07:00). Dashboard tính theo múi này; PM2 cũng đặt `TZ`.
- **Category** có `kind`: `EXPENSE` (chi tiêu và phí chuyển tiền) hoặc `INCOME` (thu nhập). Xem [categories.md](categories.md).

## Điểm cần lưu ý / nợ kỹ thuật đã biết

1. Rollback thủ công (không transaction) có thể để lại dữ liệu lệch nếu chính bước rollback cũng lỗi, hoặc nếu có request đồng thời.
2. Fee expense (có `skipBalanceAdjust`) bị khóa sửa/xóa ở trang Chi tiêu để luôn khớp với `feeAmount`/`feeExpenseId` của transfer gốc.
3. Dữ liệu mồ côi từ trước khi có xóa mềm (`archivedAt`) vẫn sửa/xóa được.
4. Sửa trực tiếp số dư/dư nợ trên form nguồn tiền được ghi vào lịch sử điều chỉnh (BalanceAdjustment), nhưng vẫn có thể khiến revert một giao dịch cũ bị chặn (ví dụ số dư không đủ để xóa income).
5. Password lưu bcrypt. Token sống 30 ngày. Logout tăng `tokenVersion` nên thu hồi mọi thiết bị.
6. Chuyển tiền không sửa được, chỉ xóa rồi tạo lại.
7. Bộ lọc `to` dùng `setHours(23,59,59)` theo giờ server (PM2 đặt `TZ=Asia/Ho_Chi_Minh`).
8. `formatMoney` dùng chung ở `src/libs/utils/formatMoney.ts`. `getRefId` vẫn nằm trong utils của từng feature.
