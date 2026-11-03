# Dashboard — `dashboard.service.ts`

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).
> Bảng phí thẻ trên dashboard: [dashboard-card-fees.md](dashboard-card-fees.md). Quy tắc phí thẻ (kỳ sao kê, miễn phí): [credit-card-fees.md](credit-card-fees.md). So sánh thẻ: [card-compare.md](card-compare.md).

`GET /api/dashboard/expenses-summary?year=&month=` chỉ thống kê **chi tiêu**. Thu nhập và dòng tiền nằm ở endpoint `cashflow` (bên dưới). Chuyển tiền không phải thu/chi nên không thống kê (phí chuyển tiền tính là chi tiêu).
- Khoảng thời gian: ngày 1 00:00 đến ngày cuối tháng 23:59:59.999, theo +07:00 (`src/server/utils/monthRange.ts`). Năm hợp lệ: 1970–9999, ngoài khoảng trả 400.
- `byCategory`: tổng theo danh mục (pie chart), sắp xếp theo tổng giảm dần.
- `byDay`: tổng theo từng ngày trong tháng (bar chart), ngày không có chi tiêu vẫn có giá trị 0.
- `bySource`: tổng theo nguồn tiền (`sourceId, sourceName, sourceType`; tab "Nguồn" kèm tỷ lệ %), sắp xếp theo tổng giảm dần. Nguồn đã bị xóa gom vào "Không xác định" (`sourceType = null`). Tỷ lệ % tính phía client = total / tổng tháng.
- `totalAmount` = tổng `byCategory`.
- **Phí chuyển tiền (expense có skipBalanceAdjust) được tính vào chi tiêu.**
- Khối "Chi tiêu tháng" (`spending-breakdown`) dùng `byCategory` / `bySource` dạng bar list (tối đa 6 dòng, phần còn lại gộp "Khác (n)", % = total / `totalAmount`) và `byDay` dạng cột cho **các ngày đã qua** (`period.daysElapsed`); bấm cột → `/transactions?type=expense&date=YYYY-MM-DD`. Màu mỗi danh mục/nguồn cố định theo id (`getCategoryColor`, `src/libs/utils/categoryColor.ts`).

**Dòng tiền** — `GET /api/dashboard/cashflow?year=&month=` (`DashboardService.getCashflowSummary`), dùng cho khối "Tháng này" và "Xu hướng thu – chi" (`incomeByCategory` vẫn trả về nhưng UI hiện chưa dùng):
- `totalIncome` = tổng Income theo `receivedAt`; `totalExpense` = tổng Expense theo `spentAt` (**gồm phí chuyển tiền**), cùng khoảng tháng +07:00 như trên. Income cũ vào thẻ tín dụng (trước khi bị chặn) vẫn tính là thu nhập.
- `net = totalIncome − totalExpense`; `savingsRate = net / totalIncome`, là `null` khi tháng không có thu nhập (UI hiện "—").
- `trend`: 6 tháng tính lùi từ tháng đang chọn (gồm tháng đó), mỗi tháng có `income, expense, net`, nhóm theo tháng giờ VN. UI bỏ các tháng trống ở đầu (trước khi bắt đầu ghi) và gắn "*" cho tháng đang chạy. `previous` = cả tháng liền trước.
- `period = { daysElapsed, daysInMonth, isCurrentMonth }` theo giờ VN: tháng hiện tại `daysElapsed` = hôm nay, tháng đã qua = cả tháng, tháng tương lai = 0.
- `samePeriodPrevious = { totalIncome, totalExpense, net, toDay }`: **chỉ khi xem tháng hiện tại**, tổng từ ngày 1 đến ngày `toDay = min(daysElapsed, số ngày tháng trước)` của tháng trước. UI "Tháng này" so với số này ("cùng kỳ (01–DD/MM)"); tháng đã qua (`null`) thì so với `previous`. Kỳ so sánh bằng 0 → "Chưa có số liệu …".
- `incomeByCategory`: giống `byCategory` của chi tiêu, danh mục đã xóa hẳn thì gom vào "Không xác định".
- Query key `DASHBOARD_CASHFLOW`, được invalidate bởi mutation expense, income và transfer.

**Tài sản** (tính phía client, `buildAssetsSummary` trong `src/libs/utils/assetsSummary.ts`, từ toàn bộ nguồn tiền; số liệu hiện tại, không đổi khi chọn tháng). Khối `net-worth-hero`: **Tài sản ròng là số chính** (kèm công thức), rồi Tiền mặt, Dư nợ thẻ, Tín dụng còn dùng được (ghi rõ "không tính vào tài sản"). "Tổng tài sản" vẫn được tính (dùng cho tỷ trọng ở bảng chi tiết) nhưng không hiển thị như một ô riêng:
- **Tiền mặt** = tổng `balance` của mọi nguồn không phải thẻ tín dụng (BANK, CASH, E_WALLET, OTHER).
- **Tín dụng có thể dùng** = tổng `max(0, creditLimit − currentDebt)` của mọi thẻ, kể cả thẻ không có dư nợ. Thanh % = phần này chia cho tổng `creditLimit`.
- **Tổng tài sản** = Tiền mặt + Tín dụng có thể dùng.
- **Tài sản ròng** = Tiền mặt − tổng dư nợ thẻ (có thể âm, khi đó hiển thị màu đỏ).
- Bảng "Chi tiết tài sản theo nguồn" gom 2 nhóm (Tiền mặt, Tín dụng có thể dùng), **ẩn nguồn có số tiền = 0**, sắp xếp giảm dần; tỷ trọng = số tiền / tổng tài sản.

**Thẻ tín dụng** (khối `credit-cards-panel`, `buildCreditCardsOverview` trong `features/dashboard/utils.ts`): **mọi** nguồn `CREDIT_CARD`, thẻ còn dư nợ lên trước (hạn gần nhất trước), các thẻ còn lại giữ thứ tự nguồn tiền. Ngày đến hạn kế tiếp là lần gần nhất (tính từ hôm nay) có ngày = `dueDate`; tháng ngắn hơn thì lấy ngày cuối tháng. Trạng thái (chỉ khi còn dư nợ): hôm nay / ≤ 3 ngày → đỏ; ≤ 7 ngày → vàng; còn lại → trung tính; không có `dueDate` → "Chưa đặt ngày đến hạn". Hệ thống không theo dõi việc đã thanh toán kỳ nào: còn dư nợ là còn nhắc. Nút **"Trả nợ"** mở `/transactions?type=transfer&action=create&toSourceId=<thẻ>&amount=<dư nợ>` (form chuyển tiền điền sẵn, người dùng chọn nguồn chuyển rồi lưu). Phí và nút "Ghi phí": [dashboard-card-fees.md](dashboard-card-fees.md).

**Cần chú ý** (khối `attention-strip`, `buildAttentionItems`): tối đa 4 mục, ẩn cả khối khi không có mục nào. Thứ tự: thẻ còn dư nợ đến hạn ≤ 7 ngày (có nút "Thanh toán", giống "Trả nợ") → thẻ có phí quản lý > 0 chưa đạt điều kiện miễn trong kỳ → phí thường niên > 0 còn ≤ 30 ngày và chưa đạt miễn → tài sản ròng âm (luôn giữ một chỗ nếu xảy ra).

Nút "Thêm chi tiêu" (khối "Tháng này") điều hướng tới `/transactions?type=expense&action=create`. Trang Giao dịch mở sẵn modal tạo chi tiêu.

**Bố cục trang `/dashboard`** (`features/dashboard/index.tsx`): Cần chú ý → Tài sản ròng (+ "Chi tiết tài sản theo nguồn" thu gọn) → Tháng này (chọn tháng, nút thêm chi tiêu; Thu / Chi / Dòng tiền ròng kèm TB chi/ngày và ngày chi nhiều nhất / Tỷ lệ tiết kiệm, âm thì màu cảnh báo) → Xu hướng thu – chi | Chi tiêu tháng (tab Danh mục / Nguồn / Ngày) → Thẻ tín dụng. Chỉ khối "Tháng này", "Xu hướng" và "Chi tiêu tháng" phụ thuộc tháng đang chọn.
