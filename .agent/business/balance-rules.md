# Quy tắc biến động số dư — expense, income, transfer

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).

Mọi giao dịch đều cập nhật số dư bằng `$inc` atomic với điều kiện trong filter (ví dụ `balance: {$gte: amount}`) để tránh âm. **Không dùng Mongo transaction.** Thay vào đó, mỗi bước có rollback thủ công bằng try/catch (bù trừ ngược). Khi sửa code, phải giữ nguyên thứ tự rollback này.

## Chi tiêu (Expense) — `expenses.service.ts`

| | Nguồn thường | Thẻ tín dụng |
|---|---|---|
| Tạo (apply) | `balance −= amount`, yêu cầu `balance ≥ amount` ("Số dư nguồn tiền không đủ") | `currentDebt += amount`, yêu cầu ≤ creditLimit ("Vượt hạn mức tín dụng còn lại") |
| Xóa (revert) | `balance += amount` | `currentDebt −= amount` (không xuống dưới 0) |
| Sửa | revert bản cũ (nguồn cũ, số tiền cũ), rồi apply bản mới; nếu lỗi thì khôi phục | như cột bên |

- `cardFeeType` (`ANNUAL_FEE`/`MANAGEMENT_FEE`/`PAYMENT_FEE`/`USAGE_FEE`/`FOREIGN_FEE`/`INTEREST`/`LATE_FEE`): đánh dấu khoản chi là phí thẻ, chỉ đặt được khi **tạo** và nguồn là thẻ tín dụng ("Phí thẻ chỉ ghi được trên thẻ tín dụng"). Khi sửa thì giữ nguyên; đổi sang nguồn không phải thẻ thì bỏ đánh dấu. Vẫn trừ số dư/dư nợ và tính vào thống kê như chi tiêu thường, chỉ không tính vào điều kiện miễn phí của thẻ. UI gắn tag theo `CARD_FEE_TYPE_LABELS`.
- **Phí giao dịch quốc tế** (`foreignFeeType`: `FX` ngoại tệ / `INTL_VND` VND tại đơn vị nước ngoài; chỉ khi **tạo**, nguồn là thẻ có cấu hình % hoặc tối thiểu của loại đó, không kèm `cardFeeType`): server tính phí theo cấu hình thẻ, trừ dư nợ **một lần** cho `amount + phí` (kiểm tra hạn mức chung), tạo khoản chi chính rồi tạo thêm một Expense phí cùng danh mục, cùng `spentAt`, `cardFeeType = FOREIGN_FEE`, note "Phí <loại> <x>% - <note>". Tạo phí lỗi thì xóa khoản chính và hoàn toàn bộ. Sau đó hai khoản độc lập, sửa/xóa như chi tiêu thường. Form chi tiêu chỉ hiện ô "Giao dịch quốc tế" khi thẻ đang chọn có cấu hình.
- `skipBalanceAdjust = true` (chỉ dùng cho **phí chuyển tiền**, xem mục Chuyển tiền): expense này **bị khóa**, API sửa/xóa trả 400. Muốn thay đổi thì xóa transfer gốc (xóa luôn fee expense) rồi tạo lại. UI gắn tag "Phí chuyển tiền" và vô hiệu nút sửa/xóa.
- Lọc danh sách: `search` (regex theo note), `categoryId`, `sourceOfMoneyId`, `from`/`to` (to = cuối ngày). Sắp xếp `spentAt desc`.

## Thu nhập (Income) — `incomes.service.ts`

**Không ghi thu nhập vào thẻ tín dụng.** Tạo, hoặc sửa mà nguồn (mới hay giữ nguyên) là thẻ, đều trả 400 "Không ghi thu nhập vào thẻ tín dụng. Hãy dùng Chuyển tiền từ nguồn khác để trả nợ thẻ". Trả nợ thẻ chỉ đi qua Transfer thường → thẻ (4.3). Form thu nhập ẩn thẻ khỏi ô chọn nguồn; thu nhập cũ đã gắn với thẻ chỉ xóa được hoặc phải chuyển sang nguồn khác khi sửa (form báo lỗi ở ô nguồn).

| | Nguồn thường | Thẻ tín dụng (chỉ thu nhập cũ) |
|---|---|---|
| Tạo (apply) | `balance += amount` | ❌ bị chặn |
| Xóa (revert) | `balance −= amount`, yêu cầu `balance ≥ amount` (nếu đã tiêu hết thì không xóa được) | `currentDebt += amount` (trong hạn mức) |
| Sửa | revert cũ rồi apply mới, có rollback | phải chuyển sang nguồn thường |

## Chuyển tiền (Transfer) — `transfers.service.ts`

Chỉ có **tạo** và **xóa**. **Không có sửa** (không có PUT).

Các trường hợp được phép (`validateTransferRules`):

| Từ → Đến | Phí | Bên chuyển | Bên nhận |
|---|---|---|---|
| Thường → Thường | **Không cho phép phí** | `balance −= amount` (phải đủ số dư) | `balance += amount` |
| Thường → Thẻ (trả nợ thẻ) | **Không cho phép phí** | `balance −= amount` | `currentDebt −= amount`; amount ≤ dư nợ hiện tại |
| Thẻ → Thường (rút/chuyển tiền từ thẻ) | Cho phép `feePercent` | `currentDebt += amount` (≤ hạn mức còn lại) | `balance += amount − feeAmount` |
| Thẻ → Thẻ | ❌ "Không hỗ trợ chuyển giữa hai thẻ tín dụng" | | |

Nguồn chuyển và nguồn nhận phải khác nhau.

**Phí chuyển đổi (chỉ khi chuyển từ thẻ tín dụng):**
- `feeAmount = round(amount × feePercent / 100)` và phải `< amount`.
- Khi có phí, bắt buộc chọn `feeCategoryId`. Hệ thống tự tạo một **Expense** với: nguồn = thẻ chuyển, amount = feeAmount, note = note của transfer (hoặc "Phí chuyển đổi X%"), `spentAt = transferredAt`, `skipBalanceAdjust: true`. ID của expense này lưu vào `transfer.feeExpenseId`.
- **Phí tối thiểu của thẻ:** nếu `feePercent > 0` và thẻ chuyển có `cashAdvanceFeeMin` thì `feeAmount = max(round(amount × feePercent / 100), cashAdvanceFeeMin)` (áp dụng cho mọi lần chuyển có phí từ thẻ đó). Form tự điền `feePercent` = `cashAdvanceFeePercent` của thẻ khi chọn nguồn chuyển (sửa được) và hiện lưu ý lãi tính ngay từ ngày rút nếu thẻ có `interestRate`.
- Ý nghĩa: dư nợ thẻ tăng **đủ amount**, người nhận chỉ được `amount − fee`. Phần phí được **ghi nhận** thành chi tiêu (để hiện trong thống kê) nhưng **không trừ số dư lần nữa**.

**Xóa transfer:** lấy lại `receiveAmount` từ bên nhận (nếu bên nhận đã tiêu hết, hoặc thẻ nhận không còn đủ hạn mức để hoàn dư nợ, thì báo lỗi), hoàn `amount` cho bên chuyển, rồi xóa fee expense và transfer.

Từ UI có hai lối vào chuyển tiền: trang `/transfers` và nút chuyển tiền trên trang `/sources-of-money`. Cả hai dùng chung `transfers/components/transfer-form-modal-content`, và UI validate trùng với server (ẩn thẻ ở ô "đến" khi "từ" là thẻ, hiển thị số dư hoặc hạn mức còn lại).
