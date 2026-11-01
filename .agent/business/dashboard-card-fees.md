# Dashboard — bảng phí thẻ tín dụng

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Phần còn lại của dashboard: [dashboard.md](dashboard.md).
> Quy tắc phí thẻ (kỳ sao kê, điều kiện miễn phí, lãi): [credit-card-fees.md](credit-card-fees.md).

Code: `src/components/features/dashboard/components/credit-card-fees/`. Số liệu tính phía client bằng `buildCreditCardFees` trong `features/dashboard/utils.ts`, kết hợp nguồn tiền với API tiến độ.

## Dữ liệu

- Gồm mọi thẻ có cấu hình phí thường niên, phí quản lý, phí thanh toán dư nợ, phí sử dụng, lãi suất hoặc phí chậm trả (kể cả thẻ không có dư nợ), kèm kỳ sao kê hiện tại. Không có thẻ nào cấu hình phí thì ẩn cả khối.
- Sắp xếp: thẻ có lần thu phí thường niên gần nhất đứng trước (`getNextAnnualDate` trong `src/libs/utils/annualFeeDate.ts`, dùng chung với server: hôm nay tính là kỳ này, đã qua thì sang năm sau).
- Trạng thái ngày thu dùng chung ngưỡng với dư nợ (≤ 3 ngày đỏ, ≤ 7 ngày cam).
- Điều kiện miễn phí: thanh tiến độ "đã đạt / mức tối thiểu", tag "Đạt" hoặc % đã đạt, và dòng "Còn thiếu …". Miễn phí quản lý hiện hai thanh nối bằng "hoặc".
- Phí thanh toán dư nợ: số lần đã trả trong kỳ và phí ước tính = max(0, số lần − số lần miễn phí) × `paymentFee`.
- "Lãi & chậm trả": lãi suất, lãi ước tính 30 ngày trên dư nợ hiện tại và quy tắc phí chậm trả.

## Màu sắc

- Thanh tiến độ miễn phí: đỏ < 50%, vàng ≥ 50%, xanh khi đạt.
- Số tiền phí sẽ bị thu: đỏ, in đậm. Phí đã đạt miễn phí (hoặc phí = 0): xanh, gạch ngang.
- Kỳ sao kê dưới tên thẻ: xanh dương (`text-sky-600 dark:text-sky-400`), không trùng màu trạng thái.
- Tag cảnh báo dùng `variant="solid"` cho dễ thấy ở dark mode.
- Số ước tính dùng ký hiệu "≈" (font hiện tại vẽ "~" giống dấu trừ).

## Ghi phí

- Mỗi thẻ có một nút "Ghi phí ▾" (antd `Dropdown`). Menu chỉ gồm các mục áp dụng cho thẻ; không có mục nào thì ẩn nút:
  - "Phí thường niên", "Phí quản lý"
  - "Phí thanh toán": chỉ khi phí ước tính > 0
  - "Phí sử dụng": chỉ khi kỳ này đã có chi tiêu
  - "Lãi": điền lãi ước tính
  - "Phí chậm trả": điền `lateFeeMin`
- Chọn một mục sẽ mở `/expenses?action=create&sourceOfMoneyId=&amount=&note=&cardFeeType=`. Trang Chi tiêu điền sẵn thẻ, số tiền ước tính và ghi chú; người dùng chọn danh mục, sửa số thực tế rồi lưu. `cardFeeType` chỉ được gửi khi vẫn chọn đúng thẻ đó.
- Không lưu trạng thái "đã thu".

## Cấu hình cột

- Nút "Cột" cạnh tiêu đề mở modal chọn cột hiển thị. Cột "Thẻ" và nút "Ghi phí" luôn hiện.
- Lưu danh sách cột **bị ẩn** ở localStorage `dashboard-card-fee-hidden-columns` (`configLocalStorageKey.DASHBOARD_CARD_FEE_HIDDEN_COLUMNS`), nên cột mới mặc định hiện.
- Áp dụng cho cả bảng desktop và danh sách mobile.
