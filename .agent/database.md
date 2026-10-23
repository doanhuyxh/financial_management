# Database — schema, quy tắc ghi, migration

MongoDB qua Mongoose 9. Kết nối: `src/server/connectDb.ts` (cache trên `global.mongoose`, `bufferCommands: false`). Model ở `src/server/models/*.model.ts`; mọi schema bật `timestamps`.

## Collections

| Model | Collection | Trường chính | Index |
|---|---|---|---|
| User | `user` | fullName, email, password (**bcrypt**), phoneNumber, avatarUrl, tokenVersion | |
| LoginAttempt | `loginAttempt` | key (IP + email, unique), failCount, lockedUntil | `key` unique |
| Category | `categories` | userId, name, kind (`EXPENSE`/`INCOME`), sortOrder, archivedAt | `{userId, sortOrder}` |
| SourceOfMoney | `sourcesOfMoney` | userId, name, type, balance, sortOrder, creditDetails{creditLimit, currentDebt, statementDate, dueDate}, bankAccount{bin, bankName, accountNumber, accountName} (chỉ BANK), metadata, archivedAt; virtual `availableCreditLimit = max(0, limit − debt)` | `{userId, sortOrder}` |
| Expense | `expenses` | userId, categoryId, sourceOfMoneyId, amount (>0), note, spentAt, skipBalanceAdjust | `{userId, spentAt: -1}` |
| Income | `incomes` | userId, categoryId, sourceOfMoneyId, amount (>0), note, receivedAt | `{userId, receivedAt: -1}` |
| BalanceAdjustment | `balanceAdjustments` | userId, sourceOfMoneyId, field (`BALANCE`/`CREDIT_DEBT`), previousValue, newValue, delta, note, adjustedAt | `{userId, sourceOfMoneyId, adjustedAt: -1}` |
| Transfer | `transfers` | userId, fromSourceId, toSourceId, amount, feePercent, feeAmount, feeCategoryId, feeExpenseId, note, transferredAt | `{userId, transferredAt: -1}` |

`SourceOfMoney.type`: `BANK`, `CASH`, `E_WALLET`, `CREDIT_CARD`, `OTHER`. Ý nghĩa nghiệp vụ của từng trường: [business-logic.md](business-logic.md).

## Quy tắc ghi (bắt buộc)

1. **Luôn lọc theo `userId`** trong mọi find/update/delete. `userId` lấy từ `getCurrentUser()`, không bao giờ từ body.
2. **Không dùng Mongo transaction.** Số dư cập nhật bằng `$inc` atomic, **điều kiện nằm ngay trong filter** của `findOneAndUpdate` (ví dụ `balance: { $gte: amount }`, điều kiện hạn mức/dư nợ của thẻ). Không chỉ kiểm tra trên bản đọc trước, vì request đồng thời có thể vượt.
3. Mỗi bước nhiều-ghi có **rollback thủ công** (try/catch, bù trừ ngược). Khi sửa service phải giữ nguyên thứ tự rollback.
4. **Xóa mềm** bằng `archivedAt` cho Category/SourceOfMoney đã có giao dịch; chưa có giao dịch thì xóa hẳn. Truy vấn danh sách/chọn phải loại bản ghi có `archivedAt`.
5. Thẻ tín dụng cập nhật theo **từng trường** (`creditDetails.creditLimit`, ...), không ghi đè cả object `creditDetails`. Đổi từ thẻ sang loại thường thì `$unset creditDetails`.
6. Tiền là số nguyên VND; phí làm tròn bằng `Math.round`.

## Migration

Dự án **không có framework migration**. Có hai cách:

**a. Backfill lười khi GET** — dùng cho trường mới có thể suy ra từ dữ liệu sẵn có. Đã dùng cho:
- `sortOrder` của Category/SourceOfMoney: thiếu thì backfill khi GET danh sách.
- `Category.kind`: thiếu thì backfill khi GET (chỉ được Income dùng → `INCOME`, còn lại → `EXPENSE`), mỗi user một lần trên mỗi tiến trình server (cache trong bộ nhớ).

Code đọc phải chịu được dữ liệu cũ thiếu trường (ví dụ thẻ cũ thiếu `currentDebt` coi là 0).

**b. Script một lần** trong `scripts/` — dùng khi cần sửa dữ liệu mà UI chặn, hoặc cần quyết định không suy ra tự động được. Quy ước (theo `scripts/migrate-income-category-kind.ts`):
- Comment đầu file giải thích lý do và cách chạy.
- Mặc định **chạy thử (dry-run)**, chỉ in báo cáo; ghi DB khi có cờ `--apply`.
- Dùng lại `dbConnect` và model trong `src/server/`; đóng kết nối khi xong.
- Idempotent: chạy lại không làm hỏng dữ liệu.
- Thêm vào bảng script ở [commands.md](commands.md#script-một-lần-scripts).

Thêm/đổi trường trong schema thì cập nhật bảng ở trên, `src/libs/interfaces/`, và [business-logic.md](business-logic.md) nếu đổi nghiệp vụ.
