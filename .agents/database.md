# Database — schema, quy tắc ghi, migration

MongoDB qua Mongoose 9. Kết nối: `src/server/connectDb.ts` (cache trên `global.mongoose`, `bufferCommands: false`). Model ở `src/server/models/*.model.ts`; mọi schema bật `timestamps`.

## Collections

| Model | Collection | Trường chính | Index |
|---|---|---|---|
| User | `user` | fullName, email, password (**bcrypt**), phoneNumber, avatarUrl, tokenVersion, ledgerLockedBefore (khóa sổ, null = không khóa) | |
| LoginAttempt | `loginAttempt` | key (IP + email, unique), failCount, lockedUntil | `key` unique |
| Category | `categories` | userId, name, kind (`EXPENSE`/`INCOME`), icon (1 emoji, ≤ 16 ký tự, null), color (`#RRGGBB`, null), sortOrder, archivedAt | `{userId, sortOrder}` |
| SourceOfMoney | `sourcesOfMoney` | userId, name, type, balance, sortOrder, ledgerCompleteAt (sổ cái đầy đủ từ mốc này, xem [business/balance-integrity.md](business/balance-integrity.md)), creditDetails{creditLimit, currentDebt, statementDate, dueDate, annualFee, annualFeeDay, annualFeeMonth, annualFeeWaiverPeriod (`YEAR`/`MONTH`), annualFeeWaiverMinSpend, managementFee, managementFeeDay, managementFeeWaiverMinTransactions, managementFeeWaiverMinSpend, paymentFee, freePaymentsPerCycle, usageFee, interestRate, cashAdvanceFeePercent, cashAdvanceFeeMin, foreignFxFeePercent, foreignFxFeeMin, foreignVndFeePercent, foreignVndFeeMin, lateFeePercentPerDay, lateFeeMin, lateFeeMax, rolloverFeePercent}, bankAccount{bin, bankName, accountNumber, accountName} (chỉ BANK), metadata, archivedAt; virtual `availableCreditLimit = max(0, limit − debt)` | `{userId, sortOrder}` |
| Expense | `expenses` | userId, categoryId, sourceOfMoneyId, amount (>0), note, spentAt, skipBalanceAdjust, cardFeeType (`ANNUAL_FEE`/`MANAGEMENT_FEE`/`PAYMENT_FEE`/`USAGE_FEE`/`FOREIGN_FEE`/`INTEREST`/`LATE_FEE`/`ROLLOVER_FEE`, tùy chọn) | `{userId, spentAt: -1}`, `{userId, sourceOfMoneyId, spentAt: -1}` |
| Income | `incomes` | userId, categoryId, sourceOfMoneyId, amount (>0), note, receivedAt | `{userId, receivedAt: -1}`, `{userId, sourceOfMoneyId, receivedAt: -1}` |
| BalanceAdjustment | `balanceAdjustments` | userId, sourceOfMoneyId, field (`BALANCE`/`CREDIT_DEBT`), kind (`OPENING`/`MANUAL`, thiếu = MANUAL), previousValue, newValue, delta, note, adjustedAt | `{userId, sourceOfMoneyId, adjustedAt: -1}` |
| Transfer | `transfers` | userId, fromSourceId, toSourceId, amount, feePercent, feeAmount, feeCategoryId, feeExpenseId, note, transferredAt | `{userId, transferredAt: -1}`, `{userId, fromSourceId, transferredAt: -1}`, `{userId, toSourceId, transferredAt: -1}` |
| CardRollover | `cardRollovers` | userId, sourceOfMoneyId (thẻ), amount, feePercent, feeAmount, feeCategoryId, feeExpenseId, paymentTransferId (Transfer tự trả đi kèm), provider, note, rolledAt ([business/card-rollover.md](business/card-rollover.md)) | `{userId, rolledAt: -1}`, `{userId, sourceOfMoneyId, rolledAt: -1}` |
| RolloverJourney | `rolloverJourneys` | userId, sourceOfMoneyId (thẻ), startedAt, baseAmount, endedAt, endReason (`PAID_OFF`/`INSTALLMENT`/`REFINANCED`/`PAID_FULL`/`OTHER`), note; phí/số lần/tự trả **không lưu**, tính từ CardRollover và Transfer trong khoảng | `{userId, sourceOfMoneyId, startedAt: -1}` |
| IntegrityIssue | `integrityIssues` | userId, sourceOfMoneyId, operation, step, amount, originalError, rollbackError, resolvedAt (bù trừ lỗi / vết đối soát) | `{userId, resolvedAt, createdAt: -1}` |
| TransactionAudit | `transactionAudits` | userId, kind (`EXPENSE`/`INCOME`/`TRANSFER`/`CARD_ROLLOVER`), refId, action (`CREATE` chỉ khi qua MCP/`UPDATE`/`DELETE`), before (`{}` khi tạo), after (snapshot, `ledger-lock-audit.md`), via (`web`/`mcp`), tokenId | `{userId, createdAt: -1}`, `{userId, kind, createdAt: -1}` |
| IdempotencyKey | `idempotencyKeys` | userId, key, route, bodyHash, status (`PENDING`/`DONE`), responseStatus, responseBody | `{userId, key}` unique, TTL 24 giờ trên `createdAt` |
| ShareLink | `shareLinks` | userId, sourceOfMoneyId, tokenHash (SHA-256 của token), label, from/to (`YYYY-MM-DD`), expiresAt, revokedAt, viewCount, lastViewedAt ([business/source-history.md](business/source-history.md)) | `tokenHash` unique, `{userId, sourceOfMoneyId, createdAt: -1}` |
| McpToken | `mcpTokens` | userId, tokenHash (SHA-256 của token `mm_pat_…`), prefix (11 ký tự đầu để nhận biết), label, scopes (`["read"]` hoặc `["read","write"]`), expiresAt, revokedAt, lastUsedAt ([business/mcp.md](business/mcp.md)) | `tokenHash` unique, `{userId, revokedAt, createdAt: -1}` |

`SourceOfMoney.type`: `BANK`, `CASH`, `E_WALLET`, `CREDIT_CARD`, `OTHER`. Ý nghĩa nghiệp vụ của từng trường: [business/sources-of-money.md](business/sources-of-money.md), phí thẻ: [business/credit-card-fees.md](business/credit-card-fees.md).

## Quy tắc ghi (bắt buộc)

1. **Luôn lọc theo `userId`** trong mọi find/update/delete. `userId` lấy từ `getCurrentUser()`, không bao giờ từ body.
2. **Không dùng Mongo transaction.** Số dư cập nhật bằng `$inc` atomic, **điều kiện nằm ngay trong filter** của `findOneAndUpdate` (ví dụ `balance: { $gte: amount }`, điều kiện hạn mức/dư nợ của thẻ). Không chỉ kiểm tra trên bản đọc trước, vì request đồng thời có thể vượt.
3. Mỗi bước nhiều-ghi có **rollback thủ công** (try/catch, bù trừ ngược), mỗi bước bù trừ bọc `safeRollback` (`server/utils/safeRollback.ts`). Khi sửa service phải giữ nguyên thứ tự rollback.
4. **Xóa mềm** bằng `archivedAt` cho Category/SourceOfMoney đã có giao dịch; chưa có giao dịch thì xóa hẳn. Truy vấn danh sách/chọn phải loại bản ghi có `archivedAt`.
5. Thẻ tín dụng cập nhật theo **từng trường** (`creditDetails.creditLimit`, ...), không ghi đè cả object `creditDetails`.
6. Tiền là số nguyên VND: đầu vào qua `parseMoney` (`server/utils/money.ts`, trần `MAX_MONEY`), trường tiền trong model có `INTEGER_MONEY_VALIDATOR`; phí làm tròn bằng `Math.round`. Ngày giao dịch qua `parseTransactionDate`.

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

Thêm/đổi trường trong schema thì cập nhật bảng ở trên, `src/libs/interfaces/`, và file tương ứng trong [business/](business/README.md) nếu đổi nghiệp vụ.
