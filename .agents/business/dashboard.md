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
- **Khối biểu đồ** (`cashflow-panel`, rộng hết hàng, một khối đổi bằng tab; tab đang chọn nền màu chính `Segmented variant="primary"`): **Ngày** (mặc định, `daily-chart`): mỗi ngày hai cột thu (`cashflow.incomeByDay`) và chi (`byDay`) cho **mọi ngày trong tháng**, ngày chưa tới (`> period.daysElapsed`) để trống và không bấm được, hôm nay có vạch đứt; tooltip có thu, chi, ròng ngày, ròng lũy kế từ đầu tháng; bấm một ngày → `/transactions?type=expense&date=YYYY-MM-DD`; mobile cuộn ngang. **Danh mục** / **Nguồn**: `byCategory` / `bySource` dạng bar list (tối đa 6 dòng, phần còn lại gộp "Khác (n)", % = total / `totalAmount`). **Tháng**: xu hướng thu – chi (`trend-chart`). Màu mỗi danh mục/nguồn cố định theo id (`getCategoryColor`, `src/libs/utils/categoryColor.ts`).
- **Cột đột biến & cuộn** (biểu đồ ngày ở đây và ở lịch sử nguồn, `clipOutliers` + `scrollToKey`): tối đa 2 giá trị > 2,5 × giá trị kế tiếp (cần ≥ 4 giá trị dương) thì trục chia theo phần còn lại, cột bị cắt có vạch đứt, số thật ở tooltip. Trục Y đứng yên khi cuộn ngang; tháng hiện tại mở ở hôm nay.
- **Cảm ứng** (mọi biểu đồ `common/bar-chart`): chạm cột lần đầu mở tooltip số tiền, chạm lần nữa mới chạy hành động của cột (VD mở chi tiêu ngày đó); cột không có hành động thì chạm lần nữa để đóng. Chuột và bàn phím: rê/focus xem tooltip, bấm một lần là chạy hành động.

**Dòng tiền** — `GET /api/dashboard/cashflow?year=&month=` (`DashboardService.getCashflowSummary`), dùng cho khối "Tháng này" và khối biểu đồ (tab Ngày, Tháng) (`incomeByCategory` vẫn trả về nhưng UI hiện chưa dùng):
- `totalIncome` = tổng Income theo `receivedAt`; `totalExpense` = tổng Expense theo `spentAt` (**gồm phí chuyển tiền**), cùng khoảng tháng +07:00 như trên. Income cũ vào thẻ tín dụng (trước khi bị chặn) vẫn tính là thu nhập.
- `net = totalIncome − totalExpense`; `savingsRate = net / totalIncome`, là `null` khi tháng không có thu nhập (UI hiện "—").
- `trend`: 6 tháng tính lùi từ tháng đang chọn (gồm tháng đó), mỗi tháng có `income, expense, net`, nhóm theo tháng giờ VN. UI bỏ các tháng trống ở đầu (trước khi bắt đầu ghi) và gắn "*" cho tháng đang chạy. `previous` = cả tháng liền trước.
- `period = { daysElapsed, daysInMonth, isCurrentMonth }` theo giờ VN: tháng hiện tại `daysElapsed` = hôm nay, tháng đã qua = cả tháng, tháng tương lai = 0.
- `samePeriodPrevious = { totalIncome, totalExpense, net, toDay }`: **chỉ khi xem tháng hiện tại**, tổng từ ngày 1 đến ngày `toDay = min(daysElapsed, số ngày tháng trước)` của tháng trước. UI "Tháng này" so với số này ("cùng kỳ (01–DD/MM)"); tháng đã qua (`null`) thì so với `previous`. Kỳ so sánh bằng 0 → "Chưa có số liệu …".
- `incomeByDay: [{ day, label, total }]`: thu nhập từng ngày của tháng đang chọn theo `receivedAt` (giờ VN), đủ mọi ngày, ngày không có thu = 0.
- `incomeByCategory`: giống `byCategory` của chi tiêu, danh mục đã xóa hẳn thì gom vào "Không xác định".
- Query key `DASHBOARD_CASHFLOW`, được invalidate bởi mutation expense, income và transfer.

**Tài sản** (tính phía client, `buildAssetsSummary` trong `src/libs/utils/assetsSummary.ts`, từ toàn bộ nguồn tiền; số liệu hiện tại, không đổi khi chọn tháng). Khối `net-worth-hero`: **Tài sản ròng là số chính** (kèm công thức), rồi Tiền mặt, Dư nợ thẻ, Tín dụng còn dùng được (ghi rõ "không tính vào tài sản"). "Tổng tài sản" vẫn được tính (dùng cho tỷ trọng ở bảng chi tiết) nhưng không hiển thị như một ô riêng:
- **Tiền mặt** = tổng `balance` của mọi nguồn không phải thẻ tín dụng (BANK, CASH, E_WALLET, OTHER).
- **Tín dụng có thể dùng** = tổng `max(0, creditLimit − currentDebt)` của mọi thẻ, kể cả thẻ không có dư nợ. Thanh % = phần này chia cho tổng `creditLimit`.
- **Tổng tài sản** = Tiền mặt + Tín dụng có thể dùng.
- **Tài sản ròng** = Tiền mặt − tổng dư nợ thẻ (có thể âm, khi đó hiển thị màu đỏ).
- Bảng "Chi tiết tài sản theo nguồn" gom 2 nhóm (Tiền mặt, Tín dụng có thể dùng), **ẩn nguồn có số tiền = 0**, sắp xếp giảm dần; tỷ trọng = số tiền / tổng tài sản.

**Thẻ tín dụng** (khối `credit-cards-panel`, `buildCreditCardsOverview` trong `features/dashboard/utils.ts`): **mọi** nguồn `CREDIT_CARD`, thẻ còn dư nợ lên trước (hạn gần nhất trước), các thẻ còn lại giữ thứ tự nguồn tiền. Ngày đến hạn kế tiếp là lần gần nhất (tính từ hôm nay) có ngày = `dueDate`; tháng ngắn hơn thì lấy ngày cuối tháng. Trạng thái (chỉ khi còn dư nợ): hôm nay / ≤ 3 ngày → đỏ; ≤ 7 ngày → vàng; còn lại → trung tính; không có `dueDate` → "Chưa đặt ngày đến hạn". Hệ thống không theo dõi việc đã thanh toán kỳ nào: còn dư nợ là còn nhắc. Nút **"Trả nợ"** mở `/transactions?type=transfer&action=create&toSourceId=<thẻ>&amount=<dư nợ>` (form chuyển tiền điền sẵn, người dùng chọn nguồn chuyển rồi lưu). Nút **"Đáo hạn"** (cũng chỉ khi còn dư nợ) mở modal ghi lần dùng dịch vụ đáo hạn ngay trên dashboard ([card-rollover.md](card-rollover.md)). Phí và nút "Ghi phí": [dashboard-card-fees.md](dashboard-card-fees.md).

**Cần chú ý** (khối `attention-strip`, `buildAttentionItems`): tối đa 4 mục, ẩn cả khối khi không có mục nào. Hiển thị dạng chip gọn một hàng (chấm màu + tiêu đề + nút; mô tả nằm trong tooltip). Thứ tự: thẻ còn dư nợ đến hạn ≤ 7 ngày (có nút "Thanh toán", giống "Trả nợ"; thẻ có % phí đáo hạn thì mô tả thêm "đáo hạn mất ≈X" và nút "Đáo hạn" mở modal) → thẻ có phí quản lý > 0 chưa đạt điều kiện miễn trong kỳ → hành trình đáo hạn có phí tích lũy ≥ 50% gốc (nút "Phân tích" mở trang Hành trình) → phí quản lý … → phí thường niên > 0 còn ≤ 30 ngày và chưa đạt miễn → tài sản ròng âm (luôn giữ một chỗ nếu xảy ra).

Nút "Thêm chi tiêu" (khối "Tháng này") điều hướng tới `/transactions?type=expense&action=create`. Trang Giao dịch mở sẵn modal tạo chi tiêu.

**Bố cục trang `/dashboard`** (`features/dashboard/index.tsx`, theo yêu cầu user 24/11/2026): Cần chú ý (chip, ẩn khi trống) → Tháng này (chọn tháng; Thu / Chi / Dòng tiền ròng kèm TB chi/ngày và ngày chi nhiều nhất / Tỷ lệ tiết kiệm, âm thì màu cảnh báo) → Tài sản ròng (+ "Chi tiết tài sản theo nguồn" **mở sẵn**, thu gọn được) → Thẻ tín dụng → Khối biểu đồ (tab Ngày / Danh mục / Nguồn / Tháng) cuối cùng. Chỉ khối "Tháng này" và khối biểu đồ phụ thuộc tháng đang chọn. Tối đa một nút đặc mỗi khối: "Trả nợ" đặc chỉ khi thẻ sắp tới hạn, "Thanh toán" trong chip là nút viền (plan 21); nút phụ (Đáo hạn, Phân tích, So sánh thẻ) dùng `ACCENT_BUTTON_CLASS` (`libs/constants/buttonStyles.ts`).
