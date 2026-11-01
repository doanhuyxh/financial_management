# Dashboard — `dashboard.service.ts`

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).
> Quy tắc phí thẻ (kỳ sao kê, miễn phí): [credit-card-fees.md](credit-card-fees.md). So sánh thẻ: [card-compare.md](card-compare.md).

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
- `totalIncome` = tổng Income theo `receivedAt`; `totalExpense` = tổng Expense theo `spentAt` (**gồm phí chuyển tiền**), cùng khoảng tháng +07:00 như trên. Income cũ vào thẻ tín dụng (trước khi bị chặn) vẫn tính là thu nhập.
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

Nút "Thêm chi tiêu" trên dashboard điều hướng tới `/expenses?action=create`. Trang chi tiêu mở sẵn modal tạo mới, sau đó xóa query param.

**Bố cục trang `/dashboard`:** Chọn tháng; nút thêm chi tiêu; header hiện tổng chi tiêu tháng và tổng dư nợ thẻ tín dụng hiện tại; phần Tài sản (4 ô: tổng tài sản, tiền mặt, tín dụng có thể dùng, tài sản ròng + bảng chi tiết theo nguồn); khối Dòng tiền (thu nhập, chi tiêu, dòng tiền ròng, tỷ lệ tiết kiệm + biểu đồ cột thu/chi 6 tháng); donut thu nhập theo danh mục; bảng dư nợ thẻ tín dụng và hạn thanh toán; bảng phí thẻ tín dụng theo kỳ sao kê (phí thường niên, phí quản lý, phí thanh toán dư nợ, tiến độ miễn phí, nút ghi phí); donut chart theo danh mục và theo nguồn tiền (số tiền + %), bar chart theo ngày
