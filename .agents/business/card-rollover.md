# Đáo hạn thẻ tín dụng — `card-rollovers.service.ts`

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).
> Số dư/dư nợ của giao dịch thường: [balance-rules.md](balance-rules.md). Phí thẻ, kỳ sao kê: [credit-card-fees.md](credit-card-fees.md).

**Nghiệp vụ thật:** "đáo hạn thẻ" là dịch vụ bên thứ ba ứng tiền trả sao kê trước ngày đến hạn, chờ ngân hàng khôi phục hạn mức rồi quẹt thẻ qua POS (giao dịch mua hàng giả) để lấy lại số đã ứng cộng phí (thường 1,5–2,5%). Dư nợ **không giảm**, chỉ lùi sang kỳ sau và mất phí; ngân hàng cấm, có thể khóa thẻ. App chỉ **ghi lại để theo dõi chi phí**, không khuyến khích; UI luôn kèm cảnh báo.

## Mô hình trong app

Hai bước (dịch vụ trả vào thẻ `amount`, rồi quẹt lại `amount + feeAmount`) triệt tiêu nhau với tiền của người dùng, nên **không tạo transfer**. Mỗi lần đáo hạn là một bản ghi `CardRollover` (collection `cardRollovers`): `sourceOfMoneyId` (thẻ), `amount` (số được ứng), `feePercent`, `feeAmount`, `feeCategoryId`, `feeExpenseId`, `provider` (≤ 100), `note` (≤ 500), `rolledAt`.

Tác động số dư: **`currentDebt += feeAmount`** (chỉ phí). Nếu `feeAmount = 0` thì không đụng dư nợ.

**Tự trả một phần (x):** một lần đáo có thể gồm x bạn tự trả, A dịch vụ ứng, n = A + phí dịch vụ quẹt lại; sau kỳ nợ còn n (giảm x − phí). Client gửi `paymentAmount` + `paymentSourceId`: server tạo **Transfer** nguồn → thẻ (lõi `createTransferRecord` trong `transfers.service.ts`, cùng quy tắc trả nợ thẻ) **trước** bước 2, lưu id vào `paymentTransferId`; lỗi bất kỳ bước sau thì `deleteTransferRecord` hoàn lại. Kiểm tra x + A ≤ dư nợ trước khi trả. Form có 2 cách nhập: "Số dịch vụ ứng (A)" hoặc "Số quẹt lại gồm phí (n)" (A = n ÷ (1 + r), sửa phí thì A = n − phí); dòng phân rã x · A · n và cảnh báo khi x + A lệch dư nợ (vẫn lưu được).

**Tạo** (`POST /api/card-rollovers`, thứ tự và rollback phải giữ nguyên):
1. Validate: thẻ thuộc user, chưa lưu trữ, là `CREDIT_CARD`; `amount > 0` và ≤ dư nợ hiện tại ("Số tiền đáo hạn tối đa bằng dư nợ đang nợ"); `feePercent` 0–100 (2 chữ số thập phân); `feeAmount` = số client gửi (làm tròn) hoặc `calcPercentFee(amount, feePercent)` khi bỏ trống; phí > 0 thì bắt buộc `feeCategoryId` là danh mục chi tiêu còn hoạt động; `rolledAt` mặc định hiện tại.
2. Phí > 0: `$inc currentDebt += feeAmount` với điều kiện trong filter `amount − ε ≤ currentDebt ≤ creditLimit − feeAmount + ε`. Không khớp → "Không ghi được phí: dư nợ vừa thay đổi hoặc phí vượt hạn mức còn lại".
3. Phí > 0: tạo Expense trên thẻ với `amount = feeAmount`, `spentAt = rolledAt`, `skipBalanceAdjust: true`, `cardFeeType = ROLLOVER_FEE`, note = note của đáo hạn hoặc "Phí đáo hạn <amount> · <provider>". Expense này **bị khóa** sửa/xóa (cùng cơ chế phí chuyển tiền), tính vào thống kê chi tiêu, **không** tính vào điều kiện miễn phí thẻ. `POST /api/expenses` từ chối `cardFeeType = ROLLOVER_FEE` ("Phí đáo hạn chỉ ghi được qua nút Đáo hạn…").
4. Tạo `CardRollover`. Lỗi ở bước 3/4 → xóa fee expense (nếu có) rồi hoàn `currentDebt −= feeAmount`.

**Xóa** (`DELETE /api/card-rollovers/[id]?deletePayment=1`): hoàn `currentDebt −= feeAmount` (filter `currentDebt ≥ feeAmount`, không thỏa → "Dư nợ hiện tại không đủ để hoàn phí đáo hạn"); thẻ đã lưu trữ/xóa hẳn thì bỏ qua bước này. Rồi xóa fee expense (chỉ document) và bản ghi; lỗi thì cộng lại phí. `deletePayment=1` xóa luôn Transfer tự trả đi kèm (UI luôn gửi khi có); lỗi ở bước này trả 400 nhưng đáo hạn đã xóa. Sau cùng, hành trình đang mở không còn lần đáo nào thì xóa hành trình. **Không có sửa**: xóa rồi ghi lại.

**Danh sách** (`GET /api/card-rollovers?sourceOfMoneyId=&page=&limit=&from=&to=`): sắp `rolledAt desc`, populate tên thẻ và danh mục phí. Mặc định 10/trang; modal dashboard lấy 5 lần gần nhất.

## Hành trình đáo hạn (`rollover-journeys.service.ts`, trang `/rollover-journey`)

- Hành trình = chuỗi đáo hạn liên tiếp của một thẻ. Collection `rolloverJourneys` chỉ lưu `startedAt`, `baseAmount` (gốc = A + x lần đầu, sửa tay qua `PATCH`), `endedAt`, `endReason`, `note`. Ghi lần đáo mà thẻ chưa có hành trình mở → `ensureOpenJourney` tạo mới (lần đáo ghi lùi ngày trước `startedAt` thì nới mốc).
- **Đóng:** lười khi đọc (`autoClosePaidOff`): hành trình mở mà dư nợ thẻ = 0 và đã có ≥ 1 lần đáo → `endedAt = now`, `endReason = PAID_OFF`. Người dùng bấm "Kết thúc hành trình" → `POST /[id]/end` với lý do (trả góp / vay chỗ khác / tự trả hết / khác). Lần đáo sau đó mở hành trình mới.
- **API:** `GET /api/rollover-journeys?cardId=` (đang mở trước, rồi mới nhất; kèm `stats { rolloverCount, totalFee, totalPaid, lastRolledAt }` tính từ CardRollover và Transfer vào thẻ trong [startedAt, endedAt]); `GET /[id]` trả `{ journey (populate thẻ), rollovers (tăng dần, populate khoản tự trả), payments (mọi Transfer vào thẻ trong khoảng, gắn `rolloverId` nếu là khoản tự trả của lần đáo) }`; `PATCH /[id]` (`baseAmount`, `note`); `POST /[id]/end`.
- **Trang** (`features/rollover-journey`, `?cardId=`; mặc định thẻ có hành trình mở): `computeJourney` trong `utils.ts` gộp thành điểm biểu đồ và dòng thời gian. Tự trả mỗi kỳ = Transfer trong (lần đáo trước, lần đáo này]; nợ sau lần đáo = amount + feeAmount; khoản trả sau lần đáo cuối trừ tiếp vào nợ. Dự kiến (chỉ hành trình mở, nợ > 0, có % phí): `projectRollovers` từ dư nợ hiện tại với x = trung bình tự trả 3 kỳ gần nhất, % phí = lần gần nhất (hoặc cấu hình thẻ), chu kỳ = khoảng cách trung bình giữa các lần đáo (≥ 2 lần) hoặc kỳ sao kê. Mốc cảnh báo khi phí tích lũy vượt 10/25/50/75/100% gốc. "Để sạch nợ sớm hơn" = `paymentToFinishIn` cho 3/6/12 kỳ. Công tắc "Chỉ thực tế" ẩn phần dự kiến.
- Lối vào: menu "Đáo hạn", link "Hành trình" trong mục Đáo hạn của dashboard, mục "Cần chú ý" khi phí ≥ 50% gốc, menu "⋯ → Hành trình đáo hạn" trang Nguồn tiền, tab Phân tích của modal.
- Util mô phỏng dùng chung: `src/libs/utils/rolloverProjection.ts` (`projectRollovers`, `breakEvenPeriods`, `minPaymentToReduce`, `paymentToFinishIn`, `interestIfCarried`). Tab "Phân tích" của modal (`common/rollover-analysis`) = tóm tắt hành trình + mô phỏng + "để sạch nợ sớm hơn" + so sánh đáo hạn liên tục / trả tối thiểu chịu lãi / trả góp (lãi giả định 1,2%/tháng, sửa được).

## Liên quan

- **Cấu hình thẻ:** `creditDetails.rolloverFeePercent` (0–100, mục "Đáo hạn thẻ" trong form nguồn tiền) chỉ để điền sẵn % trong modal và ước tính trên dashboard.
- **Tiến độ phí** (`GET /api/sources-of-money/credit-card-fees`): trả thêm `cycleRollovers`, `cycleRolloverFee` (số lần và tổng phí đáo hạn theo `rolledAt` trong kỳ sao kê). Thẻ có `rolloverFeePercent` hoặc đã từng đáo hạn cũng nằm trong danh sách trả về.
- **Modal dùng chung** `common/card-rollover-modal` (props: `source` là bản mới nhất của thẻ từ danh sách nguồn, handler từ hook `useCardRollover` trong `libs/hooks/useCardRollover.tsx`): điền sẵn dư nợ và % thẻ, đổi số tiền/% thì tính lại phí (vẫn sửa phí thực tế được), hiện phí so với lãi 30 ngày, cảnh báo rủi ro, danh sách 5 lần gần đây có nút xóa (confirm). Form dùng react-hook-form + zod (`common/card-rollover-modal/schema.ts`). Lối vào: nút **"Đáo hạn"** cạnh "Trả nợ" trên dashboard (thẻ còn dư nợ), nút "Đáo hạn" trong mục "Cần chú ý" (thẻ sắp đến hạn có cấu hình % phí), và menu "⋯" → "Đáo hạn thẻ" trên trang Nguồn tiền (thẻ còn dư nợ).
- **Dashboard** (`buildRollover` trong `features/dashboard/utils.ts`): mục "Đáo hạn" trong chi tiết phí = % phí, phí ước tính nếu đáo hết dư nợ (`calcPercentFee`), lãi 30 ngày để so sánh (`estimateInterest`, cần `interestRate`), số lần/phí kỳ này. Câu "Phí sắp tới" ưu tiên "Đã đáo hạn N lần kỳ này" ngay sau phí trả nợ. Mục "Cần chú ý" của thẻ sắp đến hạn ghi thêm "đáo hạn mất ≈X" khi thẻ có % phí.
- **So sánh thẻ**: tiêu chí "Đáo hạn dư nợ (phí 1 lần)" = `calcPercentFee(carriedDebt, rolloverFeePercent)`, kèm "rẻ/đắt hơn lãi" so với dòng lãi 30 ngày; chưa nhập % thì "Chưa nhập" và vào danh sách thiếu.
- **Lịch sử nguồn tiền:** dòng `ROLLOVER` với `delta = +feeAmount` (thẻ), kèm `rolloverAmount`, `provider`; lọc `kind=ROLLOVER` chỉ hiện với thẻ. Link public cũng có dòng này (chỉ thời gian, số tiền, nội dung). Xem [source-history.md](source-history.md).
- **Xóa mềm nguồn:** thẻ đã có đáo hạn được coi là "đã có giao dịch" (chỉ lưu trữ).
- **Cache:** mutation đáo hạn invalidate `CARD_ROLLOVERS`, `ROLLOVER_JOURNEYS`, `TRANSFERS`, `SOURCES_OF_MONEY`, `EXPENSES`, `DASHBOARD_EXPENSES_SUMMARY`, `DASHBOARD_CASHFLOW` (`useCardRollovers.ts`); chuyển tiền invalidate thêm `ROLLOVER_JOURNEYS`.
