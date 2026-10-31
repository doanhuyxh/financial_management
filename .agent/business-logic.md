# Business logic — Money Manager

> Nghiệp vụ đang chạy, đọc trước khi sửa services, số dư, chuyển tiền hoặc dashboard. Cập nhật lần cuối: 2026-10-23.
> Nguồn sự thật là `src/server/services/*.service.ts` — nếu code khác tài liệu, tin code và sửa lại tài liệu.
> Stack, luồng dữ liệu, cache: [architecture.md](architecture.md). Schema và quy tắc ghi DB: [database.md](database.md).

## 1–2. Nguyên tắc chung (thực thể: xem database.md)

- Mỗi user chỉ thấy dữ liệu của chính mình (mọi query lọc theo `userId` từ JWT).
- **Cập nhật số dư thẻ tín dụng** luôn đặt điều kiện hạn mức/dư nợ ngay trong filter của `findOneAndUpdate`, để request đồng thời không vượt hạn mức hoặc làm dư nợ âm.
- **Múi giờ:** Asia/Ho_Chi_Minh (+07:00). Dashboard tính theo múi này; PM2 cũng đặt `TZ`.
- **Category** có `kind`: `EXPENSE` (chi tiêu và phí chuyển tiền) hoặc `INCOME` (thu nhập). Xem mục 5.

## 3. Nguồn tiền (Sources of Money)

Loại (`SourcesOfMoneyType`): `BANK` (Ngân hàng), `CASH` (Tiền mặt), `E_WALLET` (Ví điện tử), `CREDIT_CARD` (Thẻ tín dụng), `OTHER` (Khác).

Có hai cách theo dõi tiền:

- **Nguồn thường** (BANK/CASH/E_WALLET/OTHER): theo dõi bằng `balance`, luôn ≥ 0.
- **Thẻ tín dụng**: `balance` luôn = 0. Theo dõi bằng `creditDetails.currentDebt` (dư nợ) và `creditLimit` (hạn mức). Ràng buộc `0 ≤ currentDebt ≤ creditLimit`. `statementDate` và `dueDate` là ngày 1–31. `dueDate` chỉ để hiển thị; `statementDate` xác định **kỳ sao kê** dùng cho điều kiện miễn phí và phí thanh toán.
- **Phí thẻ** (tùy chọn, chỉ thẻ; mọi số tiền là **ước tính**, ≥ 0, làm tròn). Các trường này **không tự động trừ** gì: khi ngân hàng thu, người dùng ghi một Expense trên thẻ với số thực tế (dư nợ tăng như chi tiêu thường), có `cardFeeType` (xem 4.1). Sửa theo từng trường (`CARD_FEE_KEYS` trong service), bỏ trống thì `$unset`.
  - **Phí thường niên:** `annualFee`; `annualFeeDay` + `annualFeeMonth` là ngày thu, lặp lại mỗi năm, phải nhập cùng nhau, cho phép 29/02 (năm thường thu vào 28/02).
  - **Miễn phí thường niên:** `annualFeeWaiverPeriod` + `annualFeeWaiverMinSpend` (> 0) nhập cùng nhau. `YEAR`: tổng chi tiêu trong **năm thẻ** = [lần thu kế tiếp − 1 năm, lần thu kế tiếp), thẻ chưa đặt ngày thu thì tính theo năm dương lịch. `MONTH` (nhãn "Theo kỳ sao kê"): chi tiêu của kỳ sao kê hiện tại.
  - **Kỳ sao kê** (`getStatementCycle` trong `src/libs/utils/statementCycle.ts`, dùng chung server và dashboard): [ngày sau lần chốt trước, ngày sau lần chốt kế tiếp); ngày chốt thuộc kỳ kết thúc vào ngày đó; tháng ngắn hơn thì chốt vào ngày cuối tháng. Thẻ chưa đặt `statementDate` thì kỳ = tháng dương lịch (giờ VN).
  - **Phí quản lý:** `managementFee` mỗi tháng, `managementFeeDay` (1–31, chỉ hiển thị).
  - **Miễn phí quản lý:** đạt **một trong hai** trong kỳ sao kê hiện tại: `managementFeeWaiverMinTransactions` (số nguyên ≥ 1) = số Expense trên thẻ, **hoặc** `managementFeeWaiverMinSpend` (> 0) = tổng chi tiêu. Nhập một hay cả hai đều được.
  - **Phí thanh toán dư nợ:** `paymentFee` (≥ 0) mỗi lần trả nợ thẻ vượt `freePaymentsPerCycle` (số nguyên ≥ 0, mặc định 0; chỉ nhập được khi có `paymentFee`) lần miễn phí trong kỳ sao kê. **Lần trả nợ** = Transfer có `toSourceId` là thẻ (theo `transferredAt`) + Income vào thẻ (theo `receivedAt`). Không tự thu: form chuyển tiền và form tạo thu nhập hiện cảnh báo (`components/common/card-payment-fee-alert`) khi nguồn đích là thẻ có `paymentFee` và ngày giao dịch thuộc kỳ hiện tại — vàng nếu lần này mất phí, xanh nếu là lần miễn phí cuối.
  - **Phí sử dụng:** `usageFee` (≥ 0) thu một lần trong kỳ sao kê nào có ít nhất một Expense chi tiêu trên thẻ (không tính phí thẻ, phí chuyển tiền); kỳ không chi tiêu thì không mất phí (VD: MoMo). Form tạo chi tiêu cảnh báo khi khoản chi là giao dịch đầu tiên của kỳ hiện tại (`expenses-form-modal/components/card-usage-fee-alert`, dựa trên `cycleTransactions`).
  - **Lãi và phí theo %** (tùy chọn): tỷ lệ % (0–100, giữ 2 chữ số thập phân) gồm `interestRate` (%/năm), `cashAdvanceFeePercent`, `foreignFxFeePercent`, `foreignVndFeePercent`, `lateFeePercentPerDay`; số tiền ≥ 0 gồm `cashAdvanceFeeMin`, `foreignFxFeeMin`, `foreignVndFeeMin`, `lateFeeMin`, `lateFeeMax` (min ≤ max). Phí có tối thiểu tính bằng `calcPercentFee` (`src/libs/utils/cardFee.ts`, dùng chung server/client) = max(round(số tiền × % / 100), tối thiểu).
  - **Lãi & phí chậm trả chỉ để hiển thị và ghi tay:** hệ thống không biết dư nợ sao kê hay kỳ nào đã trả đủ, nên không tự tính lãi/phạt. Dashboard hiện lãi ước tính 30 ngày trên dư nợ hiện tại (`estimateInterest`, năm 365 ngày) và quy tắc phí chậm trả.
  - **Chi tiêu tính điều kiện miễn phí:** Expense trên thẻ, **trừ** phí chuyển tiền (`skipBalanceAdjust`) và phí thẻ (`cardFeeType`). Income/Transfer không tính. API `GET /api/sources-of-money/credit-card-fees` (`getCreditCardFeeProgress`) trả `cycleStart, cycleEnd, cycleSpend, cycleTransactions, cyclePayments, yearSpend, yearStart, yearEnd` cho các thẻ có cấu hình miễn phí, `paymentFee` hoặc `usageFee`; query key `[SOURCES_OF_MONEY, "credit-card-fees"]` nên được làm mới cùng mọi mutation chi tiêu/nguồn tiền.

Quy tắc CRUD:

- Khi tạo/sửa, người dùng **nhập trực tiếp** số dư hoặc dư nợ. Đây là cách duy nhất để "điều chỉnh" số dư thủ công. Mỗi lần điều chỉnh sinh một bản ghi **BalanceAdjustment** (không phải giao dịch, không tính vào thống kê):
  - Tạo nguồn với số dư/dư nợ ≠ 0 thì ghi bản ghi "Số dư ban đầu" (0 → giá trị).
  - Khi sửa, client gửi `expectedAmount` = số dư (nguồn thường) hoặc dư nợ (thẻ) lúc mở form. Nếu giá trị mới **bằng** `expectedAmount` (người dùng không sửa số) thì server **giữ nguyên** số trong DB, kể cả khi giao dịch khác đã làm nó đổi. Với thẻ thì khi đó thêm điều kiện hạn mức mới ≥ dư nợ hiện tại ("Hạn mức mới không được thấp hơn dư nợ hiện tại"); thẻ cũ thiếu `currentDebt` được coi là 0. Quy tắc "dư nợ với thẻ, số dư với nguồn thường" nằm ở `getTrackedAmount` (`src/libs/utils/trackedAmount.ts`), dùng chung cho server và form.
  - Nếu giá trị mới **khác**, server chỉ ghi đè khi DB vẫn bằng `expectedAmount` (điều kiện nằm trong filter). Ngược lại trả 409 "Số dư/Dư nợ vừa thay đổi do giao dịch khác..."; client tải lại danh sách, cập nhật bản ghi đang sửa (form nhận số và `expectedAmount` mới) và báo người dùng kiểm tra rồi lưu lại. Ghi đè thành công thì ghi BalanceAdjustment kèm `adjustmentNote` (tối đa 200 ký tự). Nếu ghi lịch sử lỗi thì hoàn số cũ.
  - Thẻ tín dụng cập nhật theo từng trường (`creditDetails.creditLimit`, ...), nên sửa tên/hạn mức không ghi đè dư nợ.
  - Xem lịch sử: `GET /api/sources-of-money/[id]/adjustments?page=&limit=` (xem được cả nguồn đã lưu trữ); UI là nút "Lịch sử điều chỉnh" trên bảng nguồn tiền. Query key nằm dưới `SOURCES_OF_MONEY`.
- **Tài khoản nhận tiền / VietQR** (chỉ loại `BANK`, tùy chọn): `bankAccount` gồm `bin` (6 số NAPAS), `bankName` (tên ngắn, lưu kèm để hiển thị không cần API), `accountNumber` (chữ/số, ≤ 19 ký tự), `accountName` (server chuẩn hóa in hoa, không dấu, ≤ 50). Bỏ trống số tài khoản thì `$unset bankAccount`. Danh sách ngân hàng trong form lấy thẳng từ `https://api.vietqr.io/v2/banks` phía client (`useVietQrBanks`, cache cả phiên). Nút QR trên bảng mở modal tạo mã ngay trên trình duyệt (`buildVietQrPayload` trong `src/libs/utils/vietQr.ts`, chuẩn EMVCo/NAPAS, hiển thị bằng `QRCode` của antd): không nhập số tiền là QR tĩnh, có số tiền là QR động; nội dung bị bỏ dấu, chỉ giữ chữ/số, ≤ 50 ký tự. Quét QR không tự tạo Thu nhập — tiền về thì người dùng vẫn ghi giao dịch như bình thường.
- **Không đổi được loại** sau khi tạo (kể cả giữa các loại thường, kể cả khi chưa có giao dịch): server trả 400 "Không được đổi loại nguồn tiền", form khóa ô Loại khi sửa. Muốn đổi loại thì tạo nguồn mới.
- Có sắp xếp kéo-thả (`sortOrder`, API `/reorder`). API yêu cầu `orderedIds` gồm **toàn bộ** nguồn tiền của user; UI ẩn tay kéo khi đang tìm kiếm, lọc loại hoặc bật "Ẩn nguồn trống".
- Công tắc **"Ẩn nguồn trống"** (lọc phía client, nhớ trong localStorage `sources-of-money-hide-empty`): ẩn nguồn thường có số dư = 0 và thẻ tín dụng có dư nợ = 0 (`getTrackedAmount(source) === 0`). Chỉ ảnh hưởng trang Nguồn tiền, không ảnh hưởng ô chọn nguồn ở các form hay dashboard. Bản ghi mới nhận `sortOrder = max + 1`. Nếu dữ liệu cũ thiếu `sortOrder`, hệ thống tự backfill khi GET.
- **Xóa nguồn tiền (xóa mềm):**
  - Nguồn **chưa có** Expense/Income/Transfer thì xóa hẳn.
  - Nguồn **đã có** giao dịch thì chỉ đặt `archivedAt` (lưu trữ). Yêu cầu số dư = 0 (nguồn thường) hoặc dư nợ = 0 (thẻ); điều kiện này nằm trong filter của `findOneAndUpdate`. Nếu không thỏa thì báo "Nguồn tiền còn số dư hoặc dư nợ...".
  - Nguồn đã lưu trữ bị ẩn khỏi GET danh sách, reorder, gợi ý và ô chọn; không sửa được và không dùng được cho giao dịch mới. Lịch sử vẫn hiện tên kèm "(đã xóa)" (populate có `archivedAt`, xử lý ở `withArchivedLabel`).
  - Giao dịch cũ trên nguồn đã lưu trữ hoặc đã xóa hẳn (dữ liệu cũ) vẫn sửa/xóa được: phía nguồn đó được bỏ qua (không điều chỉnh số dư), phía còn hoạt động vẫn điều chỉnh bình thường. Khi sửa, được **giữ nguyên** nguồn đã lưu trữ, nhưng không được chọn một nguồn đã lưu trữ khác.

## 4. Quy tắc biến động số dư (cốt lõi)

Mọi giao dịch đều cập nhật số dư bằng `$inc` atomic với điều kiện trong filter (ví dụ `balance: {$gte: amount}`) để tránh âm. **Không dùng Mongo transaction.** Thay vào đó, mỗi bước có rollback thủ công bằng try/catch (bù trừ ngược). Khi sửa code, phải giữ nguyên thứ tự rollback này.

### 4.1 Chi tiêu (Expense) — `expenses.service.ts`

| | Nguồn thường | Thẻ tín dụng |
|---|---|---|
| Tạo (apply) | `balance −= amount`, yêu cầu `balance ≥ amount` ("Số dư nguồn tiền không đủ") | `currentDebt += amount`, yêu cầu ≤ creditLimit ("Vượt hạn mức tín dụng còn lại") |
| Xóa (revert) | `balance += amount` | `currentDebt −= amount` (không xuống dưới 0) |
| Sửa | revert bản cũ (nguồn cũ, số tiền cũ), rồi apply bản mới; nếu lỗi thì khôi phục | như cột bên |

- `cardFeeType` (`ANNUAL_FEE`/`MANAGEMENT_FEE`/`PAYMENT_FEE`/`USAGE_FEE`/`FOREIGN_FEE`/`INTEREST`/`LATE_FEE`): đánh dấu khoản chi là phí thẻ, chỉ đặt được khi **tạo** và nguồn là thẻ tín dụng ("Phí thẻ chỉ ghi được trên thẻ tín dụng"). Khi sửa thì giữ nguyên; đổi sang nguồn không phải thẻ thì bỏ đánh dấu. Vẫn trừ số dư/dư nợ và tính vào thống kê như chi tiêu thường, chỉ không tính vào điều kiện miễn phí của thẻ. UI gắn tag theo `CARD_FEE_TYPE_LABELS`.
- **Phí giao dịch quốc tế** (`foreignFeeType`: `FX` ngoại tệ / `INTL_VND` VND tại đơn vị nước ngoài; chỉ khi **tạo**, nguồn là thẻ có cấu hình % hoặc tối thiểu của loại đó, không kèm `cardFeeType`): server tính phí theo cấu hình thẻ, trừ dư nợ **một lần** cho `amount + phí` (kiểm tra hạn mức chung), tạo khoản chi chính rồi tạo thêm một Expense phí cùng danh mục, cùng `spentAt`, `cardFeeType = FOREIGN_FEE`, note "Phí <loại> <x>% - <note>". Tạo phí lỗi thì xóa khoản chính và hoàn toàn bộ. Sau đó hai khoản độc lập, sửa/xóa như chi tiêu thường. Form chi tiêu chỉ hiện ô "Giao dịch quốc tế" khi thẻ đang chọn có cấu hình.
- `skipBalanceAdjust = true` (chỉ dùng cho **phí chuyển tiền**, xem 4.3): expense này **bị khóa**, API sửa/xóa trả 400. Muốn thay đổi thì xóa transfer gốc (xóa luôn fee expense) rồi tạo lại. UI gắn tag "Phí chuyển tiền" và vô hiệu nút sửa/xóa.
- Lọc danh sách: `search` (regex theo note), `categoryId`, `sourceOfMoneyId`, `from`/`to` (to = cuối ngày). Sắp xếp `spentAt desc`.

### 4.2 Thu nhập (Income) — `incomes.service.ts`

| | Nguồn thường | Thẻ tín dụng |
|---|---|---|
| Tạo (apply) | `balance += amount` | **Trả nợ thẻ:** `currentDebt −= amount`, yêu cầu amount ≤ dư nợ ("Số tiền thanh toán vượt dư nợ hiện tại") |
| Xóa (revert) | `balance −= amount`, yêu cầu `balance ≥ amount` (nếu đã tiêu hết thì không xóa được) | `currentDebt += amount` |
| Sửa | revert cũ rồi apply mới, có rollback | |

### 4.3 Chuyển tiền (Transfer) — `transfers.service.ts`

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

## 5. Danh mục (Categories)

- **Loại (`kind`)**: bắt buộc khi tạo (`EXPENSE` hoặc `INCOME`, UI mặc định Chi tiêu).
  - Chỉ đổi được loại khi danh mục **chưa có** Expense/Income nào và chưa được Transfer nào dùng làm danh mục phí ("Danh mục đã có giao dịch, không thể đổi loại").
  - Dữ liệu cũ thiếu `kind` được backfill khi GET danh sách: danh mục chỉ được dùng bởi Income thì thành `INCOME`, còn lại thành `EXPENSE`. Mỗi user chỉ backfill một lần trên mỗi tiến trình server (cache trong bộ nhớ).
  - Server kiểm tra loại khi tạo expense/income, khi đổi sang danh mục khác lúc sửa, và với danh mục phí chuyển tiền (phải là `EXPENSE`). Sửa giao dịch mà **giữ nguyên** danh mục cũ khác loại thì vẫn cho qua (dữ liệu cũ dùng chung danh mục).
  - Form và bộ lọc chỉ hiện danh mục đúng loại (`filterCategoriesByKind` trong `src/libs/utils/categoryKind.ts`). Khi sửa, form vẫn giữ danh mục hiện tại của bản ghi.
- CRUD theo tên, kéo-thả sắp xếp (`/api/categories/reorder`, body `{ orderedIds }`; mọi ID phải thuộc user và phải gửi đủ toàn bộ danh mục). GET hỗ trợ lọc `search` và `kind`; trang Danh mục có bộ lọc "Loại". UI ẩn tay kéo khi đang tìm kiếm hoặc lọc loại.
- **Xóa (xóa mềm):** danh mục chưa có Expense/Income/Transfer (phí) thì xóa hẳn; đã có thì đặt `archivedAt`. Danh mục lưu trữ bị ẩn khỏi danh sách, reorder, gợi ý và ô chọn; không dùng được cho giao dịch mới, nhưng giao dịch cũ được giữ nguyên danh mục khi sửa. Lịch sử và dashboard vẫn hiện đúng tên. Dữ liệu cũ đã bị xóa hẳn trước đây vẫn gom vào "Không xác định".

## 6. Dashboard — `dashboard.service.ts`

`GET /api/dashboard/expenses-summary?year=&month=` chỉ thống kê **chi tiêu**. Thu nhập và dòng tiền nằm ở endpoint `cashflow` (bên dưới). Chuyển tiền không phải thu/chi nên không thống kê (phí chuyển tiền tính là chi tiêu).
- Khoảng thời gian: ngày 1 00:00 đến ngày cuối tháng 23:59:59.999, theo +07:00 (`src/server/utils/monthRange.ts`). Năm hợp lệ: 1970–9999, ngoài khoảng trả 400.
- `byCategory`: tổng theo danh mục (pie chart), sắp xếp theo tổng giảm dần.
- `byDay`: tổng theo từng ngày trong tháng (bar chart), ngày không có chi tiêu vẫn có giá trị 0.
- `bySource`: tổng theo nguồn tiền (`sourceId, sourceName, sourceType`; donut chart kèm tỷ lệ %), sắp xếp theo tổng giảm dần. Nguồn đã bị xóa gom vào "Không xác định" (`sourceType = null`). Tỷ lệ % tính phía client = total / tổng tháng.
- `totalAmount` = tổng `byCategory`.
- **Phí chuyển tiền (expense có skipBalanceAdjust) được tính vào chi tiêu.**
- Thẻ tổng quan ở header (tính phía client từ summary): **Trung bình / ngày** = totalAmount chia cho số ngày đã qua (tháng hiện tại tính đến hôm nay, tháng trước tính cả tháng, tháng tương lai trả về 0); **Ngày chi nhiều nhất** = ngày có tổng lớn nhất trong `byDay`; **Số danh mục đã chi** = số phần tử của `byCategory`.
- Cạnh tổng chi tiêu, header còn hiện **Tổng dư nợ thẻ tín dụng**: tổng `currentDebt` của các thẻ đang có dư nợ (cùng số với "Tổng dư nợ" ở bảng dư nợ phía dưới). Đây là dư nợ hiện tại, không đổi khi chọn tháng khác.

**Dòng tiền** — `GET /api/dashboard/cashflow?year=&month=` (`DashboardService.getCashflowSummary`), khối "Dòng tiền" và donut "Thu nhập theo danh mục":
- `totalIncome` = tổng Income theo `receivedAt`; `totalExpense` = tổng Expense theo `spentAt` (**gồm phí chuyển tiền**), cùng khoảng tháng +07:00 như trên. Income vào thẻ tín dụng (trả nợ thẻ từ bên ngoài) vẫn tính là thu nhập.
- `net = totalIncome − totalExpense`; `savingsRate = net / totalIncome`, là `null` khi tháng không có thu nhập (UI hiện "—").
- `trend`: 6 tháng tính lùi từ tháng đang chọn (gồm tháng đó), mỗi tháng có `income, expense, net`, nhóm theo tháng giờ VN. `previous` = tháng liền trước, để UI hiện % thay đổi; nếu tháng trước bằng 0 thì không so (hiện "chưa có số liệu").
- `incomeByCategory`: giống `byCategory` của chi tiêu, danh mục đã xóa hẳn thì gom vào "Không xác định".
- Query key `DASHBOARD_CASHFLOW`, được invalidate bởi mutation expense, income và transfer.

**Tài sản** (tính phía client, `buildAssetsSummary` trong `features/dashboard/utils.ts`, từ toàn bộ nguồn tiền; số liệu hiện tại, không đổi khi chọn tháng):
- **Tiền mặt** = tổng `balance` của mọi nguồn không phải thẻ tín dụng (BANK, CASH, E_WALLET, OTHER).
- **Tín dụng có thể dùng** = tổng `max(0, creditLimit − currentDebt)` của mọi thẻ, kể cả thẻ không có dư nợ. Thanh % = phần này chia cho tổng `creditLimit`.
- **Tổng tài sản** = Tiền mặt + Tín dụng có thể dùng.
- **Tài sản ròng** = Tiền mặt − tổng dư nợ thẻ (có thể âm, khi đó hiển thị màu đỏ).
- Bảng "Chi tiết tài sản theo nguồn" gom 2 nhóm (Tiền mặt, Tín dụng có thể dùng), **ẩn nguồn có số tiền = 0**, sắp xếp giảm dần; tỷ trọng = số tiền / tổng tài sản.

**Dư nợ thẻ tín dụng** (tính phía client, `features/dashboard/utils.ts`): lấy các nguồn `CREDIT_CARD` có `currentDebt > 0`. Ngày đến hạn kế tiếp là lần gần nhất (tính từ hôm nay) có ngày = `dueDate`; nếu tháng ngắn hơn thì lấy ngày cuối tháng. Trạng thái: hôm nay → "Đến hạn hôm nay" (đỏ); ≤ 3 ngày → đỏ; ≤ 7 ngày → cam; còn lại → xanh; không có `dueDate` → "Chưa đặt ngày đến hạn". Hệ thống không theo dõi việc đã thanh toán kỳ nào: còn dư nợ là còn hiện cảnh báo.

**Phí thẻ tín dụng** (tính phía client, `buildCreditCardFees` trong `features/dashboard/utils.ts`, kết hợp nguồn tiền và API tiến độ): mọi thẻ có cấu hình phí thường niên, phí quản lý, phí thanh toán dư nợ, phí sử dụng, lãi suất hoặc phí chậm trả (kể cả không có dư nợ), kèm kỳ sao kê hiện tại, thẻ có lần thu phí thường niên gần nhất đứng trước (`getNextAnnualDate` trong `src/libs/utils/annualFeeDate.ts`, dùng chung với server: hôm nay tính là kỳ này, đã qua thì sang năm sau). Trạng thái ngày thu dùng chung ngưỡng với dư nợ (≤ 3 ngày đỏ, ≤ 7 ngày cam). Mỗi điều kiện miễn phí hiện thanh tiến độ "đã đạt / mức tối thiểu" và tag "Đạt" (miễn phí quản lý hiện hai thanh nối bằng "hoặc"). Cột phí thanh toán dư nợ hiện số lần đã trả trong kỳ và phí ước tính = max(0, số lần − số lần miễn phí) × `paymentFee`. Không có thẻ nào cấu hình phí thì ẩn cả khối. Cột "Lãi & chậm trả" hiện lãi suất, lãi ước tính 30 ngày trên dư nợ hiện tại và quy tắc phí chậm trả. Nút "Ghi phí thường niên"/"Ghi phí quản lý"/"Ghi phí thanh toán" (chỉ hiện khi phí ước tính > 0)/"Ghi phí sử dụng" (chỉ hiện khi kỳ này đã có chi tiêu)/"Ghi lãi" (điền lãi ước tính)/"Ghi phí chậm trả" (điền `lateFeeMin`) mở `/expenses?action=create&sourceOfMoneyId=&amount=&note=&cardFeeType=`; trang Chi tiêu điền sẵn thẻ, số tiền ước tính và ghi chú, người dùng chọn danh mục và sửa số thực tế rồi lưu. `cardFeeType` chỉ được gửi khi vẫn chọn đúng thẻ đó. Không lưu trạng thái "đã thu".

**So sánh thẻ** (`/credit-card-compare`, tính phía client trong `features/credit-card-compare/utils.ts` từ danh sách nguồn tiền, không có API riêng):
- **Kịch bản** (lưu localStorage `credit-card-compare-scenario`): chi tiêu/tháng, số giao dịch/tháng, số lần trả nợ/kỳ, dư nợ chưa trả, một lần rút tiền mặt, một lần chi tiêu nước ngoài. Mọi phí được quy ra số tiền theo kịch bản.
- **Phí cố định/năm** = thường niên (0 nếu đạt điều kiện miễn: `YEAR` so chi tiêu/tháng × 12, `MONTH` so chi tiêu/tháng) + quản lý × 12 (0 nếu đạt số giao dịch hoặc chi tiêu) + max(0, số lần trả nợ − số lần miễn phí) × `paymentFee` × 12 + `usageFee` × 12 (nếu số giao dịch/tháng > 0). Phí thường niên/quản lý/thanh toán/sử dụng bỏ trống = 0.
- **Lãi** = `estimateInterest(dư nợ chưa trả, interestRate)` 30 ngày. **Rút tiền mặt** = `calcPercentFee` + lãi 30 ngày trên số tiền rút. **Ngoại tệ / VND nước ngoài** = `calcPercentFee` theo cấu hình. Lãi suất và phí theo % bỏ trống = "Chưa nhập", không xếp hạng.
- **Xếp hạng** mỗi tiêu chí (`rankCriterion`): cần ≥ 2 thẻ có giá trị và không bằng nhau; thẻ tốt nhất tô xanh, tệ nhất tô đỏ (hạn mức còn lại: cao là tốt; còn lại: thấp là tốt). Điểm mạnh/yếu của thẻ = các tiêu chí thẻ đó đứng đầu/cuối. "Nên dùng thẻ nào" chọn thẻ chi phí thấp nhất cho chi tiêu hằng ngày, khi chưa trả hết dư nợ, rút tiền mặt, chi tiêu ngoại tệ.

Nút "Thêm chi tiêu" trên dashboard điều hướng tới `/expenses?action=create`. Trang chi tiêu mở sẵn modal tạo mới, sau đó xóa query param.

## 7. Xác thực

- `POST /api/auth/login` với `{ email, password }`: so sánh password bằng **bcrypt**. Mật khẩu plain text cũ được hash lại ngay khi đăng nhập đúng. Sai 5 lần (theo IP + email) thì khóa 15 phút. Thành công thì set cookie `access_token` (HttpOnly, Secure, SameSite=Strict, sống 30 ngày); body chỉ trả `userId, fullName, email`, **không** trả token. `email`/`password` phải là string. Response có `Cache-Control: no-store`. JWT là HS256, `exp` 30 ngày, payload gồm `userId, email, phoneNumber, fullName, avatarUrl, tokenVersion`.
- `GET /api/auth/me` trả thông tin khi JWT còn hạn và `tokenVersion` khớp user trong DB. Response có `Cache-Control: no-store`.
- `POST /api/auth/logout` chỉ xóa cookie `access_token` (giữ cookie `theme`) và tăng `tokenVersion` để thu hồi mọi thiết bị. Response có `Cache-Control: no-store`.
- Không có đăng ký. User được tạo thẳng trong DB.
- `src/proxy.ts`: chặn mọi route trừ `/api/auth/*` và file tĩnh. Với **request trang** (kể cả `/`), proxy kiểm tra token đầy đủ qua `validateAccessToken()` (`getCurrentUser.ts`): chữ ký JWT + user còn tồn tại + `tokenVersion` khớp DB. Với **request `/api`**, proxy chỉ verify chữ ký vì service đã gọi `getCurrentUser()` (tránh query DB 2 lần). Nếu DB lỗi tạm thời, proxy rơi về kết quả kiểm tra chữ ký, không đá user ra. `tokenVersion` được cache trong bộ nhớ process (`global.tokenVersionCache`, TTL 60 giây; proxy Node.js chạy cùng process nên dùng chung cache). Logout gọi `invalidateTokenVersionCache(userId)` nên thu hồi có hiệu lực ngay. **Chỗ nào đổi `tokenVersion` cũng phải gọi hàm này.** Nếu sau này chạy nhiều instance pm2, token bị thu hồi có thể còn dùng được tối đa 60 giây ở instance khác. `/` chỉ chuyển `/dashboard` khi token hợp lệ đầy đủ. Không có token hoặc token sai/đã bị thu hồi: API nhận 401, trang bị redirect về `/?returnUrl=...`. Mọi response 401 (`unauthorizedResponse`) và redirect đăng nhập của proxy đều cố xóa cookie `access_token`, nhưng **không dựa vào bước này** (trình duyệt điện thoại có lúc không xóa được). Chống vòng lặp `/` ↔ `/dashboard` là nhờ `/` kiểm tra đầy đủ: cookie cũ còn sót thì vẫn hiện trang đăng nhập, và đăng nhập lại sẽ ghi đè cookie.
- Client: đổi phiên luôn reset state bằng hard navigation (`window.location.replace`). `AuthBootstrap` chỉ gọi `fetchAuthMe` khi status là `idle`. Logout đặt status `loggedOut` để không tự gọi lại `/auth/me`. Request API 401 (ngoài trang login) chuyển về `/?returnUrl=...`. `fetchAuthMe` retry tối đa 3 lần (cách 3 giây) chỉ cho lỗi mạng/5xx; gặp 401 thì đá về đăng nhập ngay.

## 7.1 Phiên đăng nhập

Đổi tài khoản luôn reset state client (Redux, React Query) bằng hard navigation. Logout là POST và chỉ xóa `access_token`. Cache danh sách không giữ `placeholderData` toàn cục; chỉ list phân trang dùng `keepPreviousData`.

## 7.2 Gợi ý "thường dùng" trong form — `suggestions.service.ts`

API: `GET /api/expenses/suggestions`, `/api/incomes/suggestions`, `/api/transfers/suggestions`. Không có tham số; mọi tính toán làm ở server.

- **Phạm vi:** giao dịch trong 90 ngày gần nhất của user. Expense phí chuyển tiền (`skipBalanceAdjust: true`) bị loại.
- **Điểm:** mỗi giao dịch cộng `exp(−số_ngày_trước / 30)` (giao dịch đặt ngày tương lai tính như hôm nay). Xếp theo tổng điểm giảm dần.
- **Ngưỡng:** phải xuất hiện ≥ 2 lần mới được gợi ý (riêng "nguồn hay dùng nhất của danh mục" chỉ cần 1 lần).
- Danh mục hoặc nguồn tiền đã bị xóa hoặc lưu trữ không được gợi ý.
- **Chi tiêu / thu nhập** trả về: `categoryIds` (top 5), `sourceIds` (top 3), `topAmounts` (top 4, sắp tăng dần), và `byCategory[id] = { amounts (top 4), sourceId }`.
- **Chuyển tiền** trả về: `pairs` (top 3 cặp từ→đến, mỗi cặp kèm `amounts`), `fromSourceIds` (top 3), `topAmounts`.

Cách form dùng:
- Select danh mục và nguồn tiền chia 2 nhóm "Thường dùng" và "Khác" (`groupSuggestedOptions`).
- Chip số tiền nằm dưới ô Số tiền (`common/amount-suggestion-chips`). Khi chưa chọn danh mục, chip hiện `topAmounts`; khi đã chọn, chip chỉ hiện số tiền của danh mục đó.
- Khi tạo mới, chọn danh mục mà ô nguồn tiền đang trống thì tự điền `byCategory[id].sourceId`. Ở chế độ sửa thì không tự điền.
- Form chuyển tiền có dòng "Hay chuyển": bấm vào là điền cả nguồn chuyển và nguồn nhận. Chọn nguồn chuyển khi ô "đến" đang trống thì tự điền nguồn nhận của cặp quen. Chip số tiền hiện theo cặp đang chọn, hoặc `topAmounts` khi chưa chọn nguồn.
- Query key nằm dưới `[EXPENSES|INCOMES|TRANSFERS, "suggestions"]`, nên các invalidate sẵn có tự làm mới gợi ý. Chỉ fetch khi modal mở; stale 5 phút.

## 8. Trang (UI)

| URL | Feature folder | Nội dung |
|---|---|---|
| `/` | `auth-login` | Đăng nhập |
| `/dashboard` | `dashboard` | Chọn tháng; nút thêm chi tiêu; header hiện tổng chi tiêu tháng và tổng dư nợ thẻ tín dụng hiện tại; phần Tài sản (4 ô: tổng tài sản, tiền mặt, tín dụng có thể dùng, tài sản ròng + bảng chi tiết theo nguồn); khối Dòng tiền (thu nhập, chi tiêu, dòng tiền ròng, tỷ lệ tiết kiệm + biểu đồ cột thu/chi 6 tháng); donut thu nhập theo danh mục; bảng dư nợ thẻ tín dụng và hạn thanh toán; bảng phí thẻ tín dụng theo kỳ sao kê (phí thường niên, phí quản lý, phí thanh toán dư nợ, tiến độ miễn phí, nút ghi phí); donut chart theo danh mục và theo nguồn tiền (số tiền + %), bar chart theo ngày |
| `/expenses` | `expenses` | Bảng và form chi tiêu (có tùy chọn "tiếp tục tạo"); `?action=create` mở sẵn modal, kèm `sourceOfMoneyId`/`amount`/`note`/`cardFeeType` thì điền sẵn form |
| `/incomes` | `incomes` | Bảng và form thu nhập (có tùy chọn "tiếp tục tạo") |
| `/transfers` | `transfers` | Lịch sử chuyển tiền: tạo, xóa |
| `/sources-of-money` | `sources-of-money` | Quản lý nguồn tiền, kéo-thả sắp xếp, chuyển tiền nhanh |
| `/credit-card-compare` | `credit-card-compare` | So sánh thẻ tín dụng: kịch bản sử dụng, thẻ nên dùng cho từng nhu cầu, bảng so sánh tô xanh/đỏ, điểm mạnh/yếu (xem mục So sánh thẻ) |
| `/categories` | `categories` | Quản lý danh mục, kéo-thả sắp xếp |

Menu, cache React Query và invalidate: xem [architecture.md](architecture.md#cache-react-query).

## 9. Điểm cần lưu ý / nợ kỹ thuật đã biết

1. Không dùng Mongo transaction. Rollback thủ công có thể để lại dữ liệu lệch nếu chính bước rollback cũng lỗi, hoặc nếu có request đồng thời.
2. Fee expense (có `skipBalanceAdjust`) bị khóa sửa/xóa ở trang Chi tiêu để luôn khớp với `feeAmount`/`feeExpenseId` của transfer gốc.
3. Category/SourceOfMoney đã có giao dịch chỉ được lưu trữ (xóa mềm, `archivedAt`), xem mục 3 và 5. Dữ liệu mồ côi từ trước khi có xóa mềm vẫn sửa/xóa được.
4. Sửa trực tiếp số dư/dư nợ trên form nguồn tiền được ghi vào lịch sử điều chỉnh (BalanceAdjustment), nhưng vẫn có thể khiến revert một giao dịch cũ bị chặn (ví dụ số dư không đủ để xóa income).
5. Password lưu bcrypt. Token sống 30 ngày. Logout tăng `tokenVersion` nên thu hồi mọi thiết bị.
6. Chuyển tiền không sửa được, chỉ xóa rồi tạo lại.
7. Bộ lọc `to` dùng `setHours(23,59,59)` theo giờ server (PM2 đặt `TZ=Asia/Ho_Chi_Minh`).
8. `formatMoney` dùng chung ở `src/libs/utils/formatMoney.ts`. `getRefId` vẫn nằm trong utils của từng feature.
